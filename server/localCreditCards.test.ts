import { describe, expect, it } from "vitest";
import { createLocalCreditCard, creditCardInvoiceValue, deleteLocalCreditCard, isCreditCard, normalizeCreditCard, updateLocalCreditCard, type CreditCard } from "../client/src/lib/localCreditCards";

const base: CreditCard = { id: 1, userId: 1, name: "Visa principal", bank: "Banco", brand: "Visa", dueDay: 10, totalLimit: "5000", invoiceAmount: "850", invoiceMonth: "2026-08", isPaid: false, cardType: "individual", purchases: [], createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z" };

describe("local credit cards", () => {
  it("creates an incremental card with timestamps and normalized defaults", () => {
    const cards = createLocalCreditCard([base], { ...base, id: undefined as never, createdAt: undefined as never, updatedAt: undefined as never }, new Date("2026-08-02T00:00:00.000Z"));
    expect(cards[1].id).toBe(2);
    expect(cards[1].createdAt).toBe("2026-08-02T00:00:00.000Z");
    expect(cards[1].cardType).toBe("individual");
    expect(cards[1].purchases).toEqual([]);
  });

  it("edits a card without changing its id or user", () => {
    const cards = updateLocalCreditCard([base], 1, { name: "Visa atualizado", invoiceAmount: "1200" }, new Date("2026-08-03T00:00:00.000Z"));
    expect(cards).toEqual([{ ...base, name: "Visa atualizado", invoiceAmount: "1200", updatedAt: "2026-08-03T00:00:00.000Z" }]);
    expect(cards[0].id).toBe(1);
    expect(cards[0].userId).toBe(1);
  });

  it("supports shared cards with buyer attribution per purchase", () => {
    const shared = normalizeCreditCard({ ...base, cardType: "shared", purchases: [{ id: 11, description: "Mercado", amount: "120.50", purchasedAt: "2026-08-10", buyer: "Leonardo" }] });
    expect(isCreditCard(shared)).toBe(true);
    expect(shared.cardType).toBe("shared");
    expect(shared.purchases?.[0].buyer).toBe("Leonardo");
  });

  it("normalizes legacy cards without shared-card fields", () => {
    const { cardType: _cardType, purchases: _purchases, ...legacy } = base;
    const normalized = normalizeCreditCard(legacy);
    expect(normalized.cardType).toBe("individual");
    expect(normalized.purchases).toEqual([]);
    expect(isCreditCard(legacy)).toBe(true);
  });

  it("deletes only the requested card", () => {
    const second = { ...base, id: 2, name: "Mastercard" };
    expect(deleteLocalCreditCard([base, second], 1)).toEqual([second]);
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
