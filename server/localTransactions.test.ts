import { afterEach, describe, expect, it } from "vitest";
import { createLocalTransaction, exportJson, filterLocalTransactions, loadLocalTransactions, parseBackupJson, parseImportJson, saveLocalTransactions, type LocalTransaction } from "../client/src/lib/localTransactions";

const transaction: LocalTransaction = {
  id: 1,
  userId: 1,
  type: "income",
  description: "Salário",
  amount: "2500.00",
  category: "Trabalho",
  occurredAt: "2026-08-10T12:00:00.000Z",
  createdAt: "2026-08-10T12:00:00.000Z",
  updatedAt: "2026-08-10T12:00:00.000Z",
};

const originalWindow = globalThis.window;

afterEach(() => {
  Object.defineProperty(globalThis, "window", { value: originalWindow, configurable: true });
});

describe("local transaction backups", () => {
  it("exports and imports the backup envelope", () => {
    const restored = parseBackupJson(exportJson([transaction]));
    expect(restored).toEqual([transaction]);
  });

  it("accepts a plain array for backwards-compatible imports", () => {
    expect(parseImportJson(JSON.stringify([transaction]))).toEqual([transaction]);
  });

  it("rejects malformed records", () => {
    expect(() => parseBackupJson(JSON.stringify({ transactions: [{ id: "bad" }] }))).toThrow(
      "O arquivo não contém lançamentos válidos",
    );
  });

  it("creates the next local transaction and filters it by month and year", () => {
    const created = createLocalTransaction([], {
      userId: 1,
      type: "expense",
      description: "Aluguel",
      amount: "1200.00",
      category: "Moradia",
      occurredAt: "2026-08-05T12:00:00.000Z",
    }, new Date("2026-08-06T12:00:00.000Z"));
    expect(created[0].id).toBe(1);
    expect(filterLocalTransactions(created, 8, 2026)).toHaveLength(1);
    expect(filterLocalTransactions(created, 7, 2026)).toHaveLength(0);
  });

  it("preserves credit purchase metadata in backups", () => {
    const credit: LocalTransaction = { ...transaction, type: "expense", paymentMethod: "credit", creditCardId: 4, creditTotal: "300.00", amount: "100.00", installmentIndex: 1, installmentsTotal: 3, purchaseId: 99 };
    expect(parseBackupJson(exportJson([credit]))).toEqual([credit]);
  });

  it("saves and loads transactions per user", () => {
    const values = new Map<string, string>();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { localStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) } },
    });
    saveLocalTransactions(7, [transaction]);
    expect(loadLocalTransactions(7)).toEqual([transaction]);
    expect(loadLocalTransactions(8)).toEqual([]);
  });
});
