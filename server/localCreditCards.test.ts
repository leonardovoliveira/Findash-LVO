import { describe, expect, it } from "vitest";
import { createLocalCreditCard, creditCardInvoiceValue, isCreditCard, type CreditCard } from "../client/src/lib/localCreditCards";

const base: CreditCard = { id: 1, userId: 1, name: "Visa principal", bank: "Banco", brand: "Visa", dueDay: 10, totalLimit: "5000", invoiceAmount: "850", invoiceMonth: "2026-08", isPaid: false, createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z" };

describe("local credit cards", () => {
  it("creates an incremental card with timestamps", () => {
    const cards = createLocalCreditCard([base], { ...base, id: undefined as never, createdAt: undefined as never, updatedAt: undefined as never }, new Date("2026-08-02T00:00:00.000Z"));
    expect(cards[1].id).toBe(2);
    expect(cards[1].createdAt).toBe("2026-08-02T00:00:00.000Z");
  });
  it("returns the next unpaid invoice and zero for paid invoice", () => {
    expect(creditCardInvoiceValue(base)).toBe(850);
    expect(creditCardInvoiceValue({ ...base, isPaid: true })).toBe(0);
  });
  it("rejects invalid due dates", () => {
    expect(isCreditCard(base)).toBe(true);
    expect(isCreditCard({ ...base, dueDay: 0 })).toBe(false);
    expect(isCreditCard({ ...base, invoiceMonth: "08/2026" })).toBe(false);
  });
});
