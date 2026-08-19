import { describe, expect, it } from "vitest";
import { MAX_FINANCE_STATE_BYTES, parseFinanceStatePayload } from "./financeStateValidation";

const validState = { version: 1, transactions: [], investments: [], creditCards: [], categories: [], budgets: [] };

describe("finance state validation", () => {
  it("accepts a bounded JSON-compatible finance state", () => {
    expect(parseFinanceStatePayload(validState)).toMatchObject(validState);
  });

  it("accepts optional legacy fields and serializable timestamps", () => {
    const legacyState = {
      ...validState,
      transactions: [{ id: 1, creditCardId: undefined, occurredAt: new Date("2026-08-18T12:00:00.000Z") }],
      creditCards: [{ id: 1, bankAddress: undefined }],
    };
    expect(parseFinanceStatePayload(legacyState)).toMatchObject(legacyState);
  });

  it("rejects malformed and unsafe payloads", () => {
    expect(() => parseFinanceStatePayload({ ...validState, version: 2 })).toThrow("Estado financeiro inválido");
    expect(() => parseFinanceStatePayload({ ...validState, transactions: [{ amount: Number.NaN }] })).toThrow("Estado financeiro inválido");
    expect(() => parseFinanceStatePayload({ ...validState, categories: [new Map()] })).toThrow("Estado financeiro inválido");
  });

  it("rejects payloads above the synchronization size limit", () => {
    expect(() => parseFinanceStatePayload({ ...validState, categories: ["x".repeat(MAX_FINANCE_STATE_BYTES)] })).toThrow("limite seguro");
  });
});
