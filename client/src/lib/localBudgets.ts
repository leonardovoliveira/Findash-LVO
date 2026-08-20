import type { LocalTransaction } from "./localTransactions";

export type BudgetKind = "fixed" | "variable";

export type MonthlyBudget = {
  id: number;
  month: string;
  category: string;
  kind: BudgetKind;
  plannedAmount: string;
  /** Dia de vencimento mensal usado apenas em despesas fixas. */
  dueDay?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type BudgetDueStatus = "not-applicable" | "scheduled" | "due-soon" | "due-today" | "overdue" | "settled";

export type BudgetLine = MonthlyBudget & {
  actualAmount: number;
  remainingAmount: number;
  percentUsed: number;
  dueDate?: string;
  dueStatus: BudgetDueStatus;
};

export type BudgetSummary = {
  month: string;
  plannedTotal: number;
  actualTotal: number;
  remainingTotal: number;
  percentUsed: number;
  plannedFixed: number;
  plannedVariable: number;
  actualFixed: number;
  actualVariable: number;
  unplannedActual: number;
  lines: BudgetLine[];
  status: "empty" | "on-track" | "achieved" | "over-budget";
  challengeLabel: string;
  challengeDetail: string;
};

const STORAGE_PREFIX = "findash-lvo:budgets:";

export function budgetStorageKey(userId: number | string) {
  return `${STORAGE_PREFIX}${userId}`;
}

export function isMonthlyBudget(value: unknown): value is MonthlyBudget {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return Number.isInteger(item.id)
    && typeof item.month === "string" && /^\d{4}-\d{2}$/.test(item.month)
    && typeof item.category === "string" && item.category.trim().length > 0
    && (item.kind === "fixed" || item.kind === "variable")
    && typeof item.plannedAmount === "string" && Number(item.plannedAmount) >= 0
    && (item.dueDay === undefined || (Number.isInteger(item.dueDay) && Number(item.dueDay) >= 1 && Number(item.dueDay) <= 31))
    && typeof item.createdAt === "string" && typeof item.updatedAt === "string";
}

export function loadLocalBudgets(userId: number | string): MonthlyBudget[] {
  try {
    const raw = window.localStorage.getItem(budgetStorageKey(userId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isMonthlyBudget) : [];
  } catch {
    return [];
  }
}

export function saveLocalBudgets(userId: number | string, budgets: MonthlyBudget[]) {
  window.localStorage.setItem(budgetStorageKey(userId), JSON.stringify(budgets));
}

/** Mantém a nuvem como fonte principal, mas evita apagar uma cópia local válida por um payload vazio. */
export function recoverLocalBudgets(remoteBudgets: MonthlyBudget[], localBudgets: MonthlyBudget[]) {
  return remoteBudgets.length || !localBudgets.length ? remoteBudgets : localBudgets;
}

export function createMonthlyBudget(budgets: MonthlyBudget[], input: Omit<MonthlyBudget, "id" | "createdAt" | "updatedAt">, now = new Date()): MonthlyBudget[] {
  const nowIso = now.toISOString();
  const entry: MonthlyBudget = {
    ...input,
    id: budgets.reduce((max, budget) => Math.max(max, budget.id), 0) + 1,
    category: input.category.trim(),
    plannedAmount: Number(input.plannedAmount).toFixed(2),
    dueDay: input.kind === "fixed" && Number.isInteger(input.dueDay) && Number(input.dueDay) >= 1 && Number(input.dueDay) <= 31 ? Number(input.dueDay) : undefined,
    notes: input.notes?.trim() || undefined,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  return [...budgets, entry];
}

export function updateMonthlyBudget(budgets: MonthlyBudget[], id: number, patch: Pick<MonthlyBudget, "category" | "kind" | "plannedAmount" | "dueDay" | "notes">, now = new Date()): MonthlyBudget[] {
  return budgets.map(budget => budget.id === id ? {
    ...budget,
    ...patch,
    category: patch.category.trim(),
    plannedAmount: Number(patch.plannedAmount).toFixed(2),
    dueDay: patch.kind === "fixed" && Number.isInteger(patch.dueDay) && Number(patch.dueDay) >= 1 && Number(patch.dueDay) <= 31 ? Number(patch.dueDay) : undefined,
    notes: patch.notes?.trim() || undefined,
    updatedAt: now.toISOString(),
  } : budget);
}

export function removeMonthlyBudget(budgets: MonthlyBudget[], id: number) {
  return budgets.filter(budget => budget.id !== id);
}

export function copyPreviousMonthBudget(budgets: MonthlyBudget[], targetMonth: string, now = new Date()): MonthlyBudget[] {
  const [year, month] = targetMonth.split("-").map(Number);
  const previousDate = new Date(year, month - 2, 1);
  const previousMonth = `${previousDate.getFullYear()}-${String(previousDate.getMonth() + 1).padStart(2, "0")}`;
  const targetCategories = new Set(budgets.filter(budget => budget.month === targetMonth).map(budget => `${budget.kind}:${budget.category.toLocaleLowerCase("pt-BR")}`));
  const source = budgets.filter(budget => budget.month === previousMonth && !targetCategories.has(`${budget.kind}:${budget.category.toLocaleLowerCase("pt-BR")}`));
  return source.reduce((next, budget) => createMonthlyBudget(next, { month: targetMonth, category: budget.category, kind: budget.kind, plannedAmount: budget.plannedAmount, dueDay: budget.dueDay, notes: budget.notes }, now), budgets);
}

export function budgetCategoriesForMonth(budgets: MonthlyBudget[], month: string) {
  const seen = new Set<string>();
  return budgets.filter(budget => budget.month === month).map(budget => budget.category.trim()).filter(category => {
    const key = category.toLocaleLowerCase("pt-BR");
    if (!category || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function budgetCategoryTransactions(transactions: LocalTransaction[], month: string, category: string) {
  const normalizedCategory = category.trim().toLocaleLowerCase("pt-BR");
  return transactions.filter(transaction => transaction.type === "expense" && transaction.occurredAt.slice(0, 7) === month && transaction.category.trim().toLocaleLowerCase("pt-BR") === normalizedCategory).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

export function budgetDueAlert(budget: Pick<MonthlyBudget, "month" | "kind" | "dueDay" | "plannedAmount">, actualAmount: number, today = new Date()): Pick<BudgetLine, "dueDate" | "dueStatus"> {
  if (budget.kind !== "fixed" || !budget.dueDay) return { dueStatus: "not-applicable" };
  const [year, month] = budget.month.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const dueDate = new Date(year, month - 1, Math.min(budget.dueDay, lastDay), 12, 0, 0, 0);
  const todayAtNoon = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0, 0);
  const daysUntilDue = Math.round((dueDate.getTime() - todayAtNoon.getTime()) / 86_400_000);
  const plannedAmount = Number(budget.plannedAmount) || 0;
  const dueDateValue = dueDate.toISOString().slice(0, 10);
  if (plannedAmount > 0 && actualAmount >= plannedAmount) return { dueDate: dueDateValue, dueStatus: "settled" };
  if (daysUntilDue < 0) return { dueDate: dueDateValue, dueStatus: "overdue" };
  if (daysUntilDue === 0) return { dueDate: dueDateValue, dueStatus: "due-today" };
  if (daysUntilDue <= 3) return { dueDate: dueDateValue, dueStatus: "due-soon" };
  return { dueDate: dueDateValue, dueStatus: "scheduled" };
}

export function getBudgetSummary(budgets: MonthlyBudget[], transactions: LocalTransaction[], month: string, today = new Date()): BudgetSummary {
  const monthlyBudgets = budgets.filter(budget => budget.month === month).sort((a, b) => a.kind.localeCompare(b.kind) || a.category.localeCompare(b.category));
  const expenses = transactions.filter(transaction => transaction.type === "expense" && transaction.occurredAt.slice(0, 7) === month);
  const actualByCategory = expenses.reduce((totals, transaction) => {
    const category = transaction.category.trim().toLocaleLowerCase("pt-BR");
    totals.set(category, (totals.get(category) ?? 0) + Number(transaction.amount || 0));
    return totals;
  }, new Map<string, number>());
  const budgetedCategories = new Set(monthlyBudgets.map(budget => budget.category.trim().toLocaleLowerCase("pt-BR")));
  const lines = monthlyBudgets.map(budget => {
    const actualAmount = actualByCategory.get(budget.category.trim().toLocaleLowerCase("pt-BR")) ?? 0;
    const plannedAmount = Number(budget.plannedAmount) || 0;
    return { ...budget, actualAmount, remainingAmount: plannedAmount - actualAmount, percentUsed: plannedAmount > 0 ? (actualAmount / plannedAmount) * 100 : actualAmount > 0 ? 100 : 0, ...budgetDueAlert(budget, actualAmount, today) };
  });
  const plannedTotal = lines.reduce((sum, line) => sum + Number(line.plannedAmount), 0);
  const actualTotal = expenses.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  const plannedFixed = lines.filter(line => line.kind === "fixed").reduce((sum, line) => sum + Number(line.plannedAmount), 0);
  const plannedVariable = plannedTotal - plannedFixed;
  const actualFixed = lines.filter(line => line.kind === "fixed").reduce((sum, line) => sum + line.actualAmount, 0);
  const actualVariable = actualTotal - actualFixed;
  const unplannedActual = expenses.filter(transaction => !budgetedCategories.has(transaction.category.trim().toLocaleLowerCase("pt-BR"))).reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  const [year, monthNumber] = month.split("-").map(Number);
  const endOfMonth = new Date(year, monthNumber, 0, 23, 59, 59, 999);
  const isClosed = today > endOfMonth;
  const remainingTotal = plannedTotal - actualTotal;
  const percentUsed = plannedTotal > 0 ? (actualTotal / plannedTotal) * 100 : 0;
  const status: BudgetSummary["status"] = plannedTotal <= 0 ? "empty" : actualTotal > plannedTotal ? "over-budget" : isClosed ? "achieved" : "on-track";
  const challengeLabel = status === "achieved" ? "Meta atingida" : status === "over-budget" ? "Atenção ao orçamento" : status === "on-track" ? "No caminho certo" : "Crie sua meta";
  const challengeDetail = status === "achieved" ? `Você encerrou o mês com ${formatAmount(remainingTotal)} de folga.` : status === "over-budget" ? `O orçamento foi ultrapassado em ${formatAmount(Math.abs(remainingTotal))}.` : status === "on-track" ? `Ainda há ${formatAmount(Math.max(remainingTotal, 0))} disponíveis para este mês.` : "Cadastre limites por categoria para acompanhar suas metas.";
  return { month, plannedTotal, actualTotal, remainingTotal, percentUsed, plannedFixed, plannedVariable, actualFixed, actualVariable, unplannedActual, lines, status, challengeLabel, challengeDetail };
}

function formatAmount(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}
