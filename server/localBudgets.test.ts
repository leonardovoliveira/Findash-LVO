import { describe, expect, it } from "vitest";
import { budgetCategoriesForMonth, budgetCategoryTransactions, budgetDueAlert, copyPreviousMonthBudget, createMonthlyBudget, getBudgetSummary, recoverLocalBudgets, removeMonthlyBudget, sortBudgetLinesByDueStatus, updateMonthlyBudget } from "../client/src/lib/localBudgets";
import type { LocalTransaction } from "../client/src/lib/localTransactions";

const transactions: LocalTransaction[] = [
  { id: 1, userId: 1, type: "expense", description: "Aluguel", amount: "1200", category: "Moradia", occurredAt: "2026-08-05", createdAt: "2026-08-05T12:00:00.000Z", updatedAt: "2026-08-05T12:00:00.000Z" },
  { id: 2, userId: 1, type: "expense", description: "Mercado", amount: "300", category: "Alimentação", occurredAt: "2026-08-10", createdAt: "2026-08-10T12:00:00.000Z", updatedAt: "2026-08-10T12:00:00.000Z" },
  { id: 3, userId: 1, type: "expense", description: "Cinema", amount: "80", category: "Lazer", occurredAt: "2026-08-12", createdAt: "2026-08-12T12:00:00.000Z", updatedAt: "2026-08-12T12:00:00.000Z" },
];

describe("local budgets", () => {
  it("returns unique budget categories for the selected month", () => {
    const initial = createMonthlyBudget([], { month: "2026-08", category: "Moradia", kind: "fixed", plannedAmount: "1000" });
    const current = createMonthlyBudget(initial, { month: "2026-08", category: " moradia ", kind: "variable", plannedAmount: "200" });
    const budgets = createMonthlyBudget(current, { month: "2026-09", category: "Viagem", kind: "variable", plannedAmount: "400" });
    expect(budgetCategoriesForMonth(budgets, "2026-08")).toEqual(["Moradia"]);
  });

  it("returns expense transactions from the selected month and category", () => {
    const matches = budgetCategoryTransactions(transactions, "2026-08", "alimentação");
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ description: "Mercado", category: "Alimentação", type: "expense" });
  });

  it("creates, updates and removes monthly budget lines", () => {
    const created = createMonthlyBudget([], { month: "2026-08", category: "Moradia", kind: "fixed", plannedAmount: "1400", dueDay: 10 }, new Date("2026-08-01T12:00:00.000Z"));
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ id: 1, plannedAmount: "1400.00", kind: "fixed", dueDay: 10 });
    const updated = updateMonthlyBudget(created, 1, { category: "Moradia", kind: "fixed", plannedAmount: "1500", dueDay: 12, notes: "Aluguel e condomínio" }, new Date("2026-08-02T12:00:00.000Z"));
    expect(updated[0]).toMatchObject({ plannedAmount: "1500.00", dueDay: 12, notes: "Aluguel e condomínio" });
    expect(removeMonthlyBudget(updated, 1)).toEqual([]);
  });

  it("combines planned values with actual expenses and flags unplanned spending", () => {
    const firstBudget = createMonthlyBudget([], { month: "2026-08", category: "Moradia", kind: "fixed", plannedAmount: "1400" });
    const budgets = createMonthlyBudget(firstBudget, { month: "2026-08", category: "Alimentação", kind: "variable", plannedAmount: "500" });
    const summary = getBudgetSummary(budgets, transactions, "2026-08", new Date("2026-08-17T12:00:00.000Z"));
    expect(summary.plannedTotal).toBe(1900);
    expect(summary.actualTotal).toBe(1580);
    expect(summary.remainingTotal).toBe(320);
    expect(summary.unplannedActual).toBe(80);
    expect(summary.status).toBe("on-track");
    expect(summary.lines.find(line => line.category === "Moradia")?.actualAmount).toBe(1200);
  });

  it("rewards a closed month that ends within its planned amount", () => {
    const budgets = createMonthlyBudget([], { month: "2026-07", category: "Moradia", kind: "fixed", plannedAmount: "1300" });
    const summary = getBudgetSummary(budgets, transactions.map(transaction => ({ ...transaction, occurredAt: transaction.occurredAt.replace("2026-08", "2026-07") })), "2026-07", new Date("2026-08-01T12:00:00.000Z"));
    expect(summary.status).toBe("over-budget");
    const achieved = getBudgetSummary(budgets, [transactions[0] ? { ...transactions[0], occurredAt: "2026-07-05", amount: "1200" } : transactions[0]], "2026-07", new Date("2026-08-01T12:00:00.000Z"));
    expect(achieved.status).toBe("achieved");
    expect(achieved.challengeLabel).toBe("Meta atingida");
  });

  it("copies categories from the immediately prior month without duplicates", () => {
    const july = createMonthlyBudget([], { month: "2026-07", category: "Moradia", kind: "fixed", plannedAmount: "1400", dueDay: 8 });
    const copied = copyPreviousMonthBudget(july, "2026-08", new Date("2026-08-01T12:00:00.000Z"));
    expect(copied).toHaveLength(2);
    expect(copied[1]).toMatchObject({ month: "2026-08", category: "Moradia", plannedAmount: "1400.00", dueDay: 8 });
    expect(copyPreviousMonthBudget(copied, "2026-08")).toHaveLength(2);
  });

  it("keeps a valid local backup when a cloud payload has no budgets", () => {
    const local = createMonthlyBudget([], { month: "2026-08", category: "Moradia", kind: "fixed", plannedAmount: "1400" });
    expect(recoverLocalBudgets([], local)).toEqual(local);
    expect(recoverLocalBudgets(local, [])).toEqual(local);
  });

  it("classifies fixed-expense due dates as upcoming, today, overdue or settled", () => {
    const budget = { month: "2026-08", kind: "fixed" as const, plannedAmount: "1200", dueDay: 20 };
    expect(budgetDueAlert(budget, 0, new Date("2026-08-18T12:00:00.000Z")).dueStatus).toBe("due-soon");
    expect(budgetDueAlert(budget, 0, new Date("2026-08-20T12:00:00.000Z")).dueStatus).toBe("due-today");
    expect(budgetDueAlert(budget, 0, new Date("2026-08-21T12:00:00.000Z")).dueStatus).toBe("overdue");
    expect(budgetDueAlert(budget, 1200, new Date("2026-08-21T12:00:00.000Z")).dueStatus).toBe("settled");
  });

  it("keeps manually paid expenses settled and prioritizes overdue due dates", () => {
    const budgets = [
      createMonthlyBudget([], { month: "2026-08", category: "Internet", kind: "fixed", plannedAmount: "100", dueDay: 5 })[0],
      createMonthlyBudget([], { month: "2026-08", category: "Aluguel", kind: "fixed", plannedAmount: "1000", dueDay: 20 })[0],
      createMonthlyBudget([], { month: "2026-08", category: "Streaming", kind: "fixed", plannedAmount: "30", dueDay: 28 })[0],
    ].map((budget, index) => ({ ...budget, id: index + 1, paidAt: index === 2 ? "2026-08-01T12:00:00.000Z" : undefined }));
    const lines = getBudgetSummary(budgets, [], "2026-08", new Date("2026-08-18T12:00:00.000Z")).lines;
    expect(sortBudgetLinesByDueStatus(lines).map(line => line.category)).toEqual(["Internet", "Aluguel", "Streaming"]);
    expect(lines.find(line => line.category === "Streaming")?.dueStatus).toBe("settled");
  });

  it("treats a manually paid fixed expense as settled even without a matching transaction", () => {
    expect(budgetDueAlert({ month: "2026-08", kind: "fixed", plannedAmount: "100", dueDay: 5, paidAt: "2026-08-01T12:00:00.000Z" }, 0, new Date("2026-08-12T12:00:00.000Z")).dueStatus).toBe("settled");
  });
});
