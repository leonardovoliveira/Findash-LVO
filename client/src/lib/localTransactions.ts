import type { Transaction } from "../../../drizzle/schema";

export type LocalTransaction = Omit<Transaction, "occurredAt" | "createdAt" | "updatedAt"> & {
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
  icon?: string;
  store?: string;
  product?: string;
  paymentMethod?: PaymentMethod;
  creditCardId?: number;
  creditTotal?: string;
  installmentIndex?: number;
  installmentsTotal?: number;
  purchaseId?: number;
  invoiceMonth?: string;
};

export type PaymentMethod = "cash" | "pix" | "boleto" | "debit" | "credit";

const STORAGE_PREFIX = "findash-lvo:transactions:";

export function storageKey(userId: number | string) {
  return `${STORAGE_PREFIX}${userId}`;
}

export function loadLocalTransactions(userId: number | string): LocalTransaction[] {
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isLocalTransaction) : [];
  } catch {
    return [];
  }
}

export function saveLocalTransactions(userId: number | string, transactions: LocalTransaction[]) {
  window.localStorage.setItem(storageKey(userId), JSON.stringify(transactions));
}

export function filterLocalTransactions(transactions: LocalTransaction[], month: number, year: number) {
  return transactions.filter(item => {
    const date = new Date(item.occurredAt);
    return date.getMonth() + 1 === month && date.getFullYear() === year;
  });
}

export function filterLocalTransactionsByInvoiceMonth(transactions: LocalTransaction[], month: number, year: number) {
  const invoiceMonth = `${year}-${String(month).padStart(2, "0")}`;
  return transactions.filter(item => {
    if (item.type === "expense" && item.paymentMethod === "credit") return (item.invoiceMonth ?? item.occurredAt.slice(0, 7)) === invoiceMonth;
    const date = new Date(item.occurredAt);
    return date.getMonth() + 1 === month && date.getFullYear() === year;
  });
}

export function createLocalTransaction(
  transactions: LocalTransaction[],
  input: Omit<LocalTransaction, "id" | "createdAt" | "updatedAt">,
  now = new Date(),
): LocalTransaction[] {
  const nowIso = now.toISOString();
  const next: LocalTransaction = {
    ...input,
    id: transactions.reduce((max, item) => Math.max(max, item.id), 0) + 1,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  return [...transactions, next];
}

export function isLocalTransaction(value: unknown): value is LocalTransaction {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    Number.isInteger(item.id) &&
    (item.type === "income" || item.type === "expense") &&
    typeof item.description === "string" &&
    item.description.trim().length > 0 &&
    typeof item.amount === "string" &&
    Number(item.amount) > 0 &&
    typeof item.category === "string" &&
    item.category.trim().length > 0 &&
    (item.icon === undefined || typeof item.icon === "string") &&
    typeof item.occurredAt === "string" &&
    !Number.isNaN(Date.parse(item.occurredAt)) &&
    (item.paymentMethod === undefined || ["cash", "pix", "boleto", "debit", "credit"].includes(String(item.paymentMethod))) &&
    (item.creditCardId === undefined || Number.isInteger(item.creditCardId)) &&
    (item.installmentIndex === undefined || Number.isInteger(item.installmentIndex)) &&
    (item.installmentsTotal === undefined || (Number.isInteger(item.installmentsTotal) && Number(item.installmentsTotal) >= 1)) &&
    (item.purchaseId === undefined || Number.isInteger(item.purchaseId)) &&
    (item.invoiceMonth === undefined || (typeof item.invoiceMonth === "string" && /^\\d{4}-\\d{2}$/.test(item.invoiceMonth)))
  );
}

export function parseImportJson(raw: string): LocalTransaction[] {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || !parsed.every(isLocalTransaction)) {
    throw new Error("O arquivo não contém lançamentos válidos do Findash LVO.");
  }
  return parsed;
}

export function exportJson(transactions: LocalTransaction[]) {
  return JSON.stringify(
    {
      format: "findash-lvo-transactions",
      version: 1,
      exportedAt: new Date().toISOString(),
      transactions,
    },
    null,
    2,
  );
}

export function parseBackupJson(raw: string): LocalTransaction[] {
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as { transactions?: unknown }).transactions)) {
    return parseImportJson(raw);
  }
  return parseImportJson(JSON.stringify((parsed as { transactions: unknown[] }).transactions));
}
