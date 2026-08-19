import { describe, expect, it } from "vitest";
import { MAX_FINANCE_STATE_BYTES, parseFinanceStatePayload } from "./financeStateValidation";

const validState = { version: 1, transactions: [], investments: [], creditCards: [], categories: [], budgets: [] };

describe("finance state validation", () => {
  it("accepts a bounded JSON-compatible finance state", () => {
    expect(parseFinanceStatePayload(validState)).toMatchObject(validState);
  });

  it("rejects malformed and unsafe payloads", () => {
    expect(() => parseFinanceStatePayload({ ...validState, version: 2 })).toThrow("Estado financeiro inválido");
    expect(() => parseFinanceStatePayload({ ...validState, transactions: [{ amount: Number.NaN }] })).toThrow("Estado financeiro inválido");
    expect(() => parseFinanceStatePayload({ ...validState, categories: [new Date()] })).toThrow("Estado financeiro inválido");
  });

  it("rejects payloads above the synchronization size limit", () => {
    expect(() => parseFinanceStatePayload({ ...validState, categories: ["x".repeat(MAX_FINANCE_STATE_BYTES)] })).toThrow("limite seguro");
  });
});
