import { describe, expect, it } from "vitest";
import { applyCreditPurchase, creditCardInvoiceUsage, creditCardPurchaseInvoiceMonth, createLocalCreditCard, creditCardInvoiceMonths, creditCardInvoiceValue, creditCardIsInvoicePaid, deleteLocalCreditCard, isCreditCard, normalizeCreditCard, setCreditCardInvoicePaid, updateLocalCreditCard, type CreditCard } from "../client/src/lib/localCreditCards";

const base: CreditCard = { id: 1, userId: 1, name: "Visa principal", bank: "Banco", brand: "Visa", dueDay: 10, closingDay: 19, totalLimit: "5000", invoiceAmount: "850", invoiceMonth: "2026-08", isPaid: false, invoices: {}, cardType: "individual", purchases: [], createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z" };

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

  it("assigns purchases before and on the closing day to the expected invoice month", () => {
    expect(creditCardPurchaseInvoiceMonth({ closingDay: 19 }, "2026-08-18")).toBe("2026-08");
    expect(creditCardPurchaseInvoiceMonth({ closingDay: 19 }, "2026-08-19")).toBe("2026-09");
    const [updated] = applyCreditPurchase([base], { cardId: 1, purchaseId: 500, description: "Compra", total: 200, purchasedAt: "2026-08-19", installments: 1 });
    expect(updated.invoices?.["2026-09"]).toBe("200.00");
    expect(updated.purchases?.[0].invoiceMonth).toBe("2026-09");
  });

  it("calculates invoice usage and caps progress at 100 percent", () => {
    expect(creditCardInvoiceUsage({ ...base, totalLimit: "1000", invoiceAmount: "250" })).toEqual({ spent: 250, limit: 1000, available: 750, percentage: 25 });
    expect(creditCardInvoiceUsage({ ...base, totalLimit: "1000", invoiceAmount: "1500" }).percentage).toBe(100);
  });

  it("returns the next unpaid invoice and zero for paid invoice", () => {
    expect(creditCardInvoiceValue(base)).toBe(850);
    expect(creditCardInvoiceValue({ ...base, isPaid: true })).toBe(0);
  });

  it("applies equal monthly installments and rounds the final installment", () => {
    const cards = applyCreditPurchase([base], { cardId: 1, purchaseId: 100, description: "Notebook", total: 100, purchasedAt: "2026-08-12", installments: 3 });
    expect(cards[0].invoices).toEqual({ "2026-08": "33.33", "2026-09": "33.33", "2026-10": "33.34" });
    expect(cards[0].purchases?.map(purchase => purchase.amount)).toEqual(["33.33", "33.33", "33.34"]);
    expect(cards[0].purchases?.map(purchase => purchase.installmentIndex)).toEqual([1, 2, 3]);
    expect(creditCardInvoiceValue(cards[0])).toBe(33.33);
  });

  it("navigates invoice competencies and stores payment independently by month", () => {
    const cards = applyCreditPurchase([base], { cardId: 1, purchaseId: 100, description: "Notebook", total: 100, purchasedAt: "2026-08-12", installments: 3 });
    expect(creditCardInvoiceMonths(cards[0])).toEqual(["2026-08", "2026-09", "2026-10"]);
    expect(creditCardIsInvoicePaid(cards[0], "2026-08")).toBe(false);
    const paid = setCreditCardInvoicePaid(cards, 1, "2026-09", true);
    expect(creditCardIsInvoicePaid(paid[0], "2026-09")).toBe(true);
    expect(creditCardIsInvoicePaid(paid[0], "2026-08")).toBe(false);
    expect(paid[0].isPaid).toBe(false);
  });

  it("rejects invalid due dates", () => {
    expect(isCreditCard(base)).toBe(true);
    expect(isCreditCard({ ...base, dueDay: 0 })).toBe(false);
    expect(isCreditCard({ ...base, invoiceMonth: "08/2026" })).toBe(false);
  });
});
