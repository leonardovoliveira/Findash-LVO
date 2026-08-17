import { describe, expect, it } from "vitest";
import { appendInvestmentOperation, applyInvestmentQuote, consolidateInvestmentOperations, consolidateInvestmentsByTicker, createLocalInvestment, investmentCategories, investmentCost, investmentMarketValue, investmentProfitability, investmentValue, isLocalInvestment, type LocalInvestment } from "../client/src/lib/localInvestments";

const base: LocalInvestment = {
  id: 1,
  userId: 7,
  name: "Tesouro Selic 2029",
  ticker: "LFT2029",
  category: "treasury",
  institution: "Corretora",
  quantity: "10",
  averagePrice: "100",
  currentValue: "1050",
  notes: "",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("local investments", () => {
  it("creates a position with an incremental id and timestamps", () => {
    const created = createLocalInvestment([base], { ...base, ticker: "B3SA3", id: undefined as never, createdAt: undefined as never, updatedAt: undefined as never }, new Date("2026-02-01T00:00:00.000Z"));
    expect(created).toHaveLength(2);
    expect(created[1].id).toBe(2);
    expect(created[1].createdAt).toBe("2026-02-01T00:00:00.000Z");
  });

  it("accepts every requested investment category", () => {
    expect(investmentCategories.map(category => category.value)).toEqual(["fixed-income", "equities", "funds", "treasury", "dollar", "crypto"]);
    expect(investmentCategories).toHaveLength(6);
  });

  it("calculates cost from quantity times average price", () => {
    expect(investmentCost({ quantity: "10", averagePrice: "100" })).toBe(1000);
  });

  it("applies a successful quote to the position and records source metadata", () => {
    const updated = applyInvestmentQuote(base, { ok: true, price: 120, changePercent: 2.5, previousClose: 115, source: "brapi.dev", fetchedAt: "2026-08-15T12:00:00.000Z" });
    expect(updated.marketPrice).toBe("120");
    expect(updated.currentValue).toBe("1200");
    expect(updated.quoteSource).toBe("brapi.dev");
    expect(updated.quoteFetchedAt).toBe("2026-08-15T12:00:00.000Z");
    expect(updated.quoteError).toBe("");
    expect(updated.quoteChangePercent).toBe("2.5");
    expect(updated.quotePreviousClose).toBe("115");
  });

  it("keeps the prior value and records a quote fallback error", () => {
    const updated = applyInvestmentQuote(base, { ok: false, source: "brapi.dev", fetchedAt: "2026-08-15T12:01:00.000Z", error: "HTTP 403" });
    expect(updated.currentValue).toBe(base.currentValue);
    expect(updated.quoteError).toBe("HTTP 403");
    expect(updated.quoteSource).toBeUndefined();
  });

  it("uses market price for current market value and falls back to cost", () => {
    expect(investmentMarketValue({ currentValue: "1000", quantity: "10", averagePrice: "100", marketPrice: "120" })).toBe(1200);
    expect(investmentMarketValue({ currentValue: "1000", quantity: "10", averagePrice: "100" })).toBe(1000);
  });

  it("calculates portfolio value without replacing an explicit zero", () => {
    expect(investmentValue({ currentValue: "", quantity: "10", averagePrice: "100" })).toBe(1000);
    expect(investmentValue({ currentValue: "0", quantity: "10", averagePrice: "100" })).toBe(0);
    expect(investmentValue({ currentValue: "1050", quantity: "10", averagePrice: "100" })).toBe(1050);
  });

  it("consolidates buys and sells into quantity, average price and realized profit", () => {
    const operations = [
      { id: 1, type: "buy" as const, quantity: "10", price: "100", date: "2026-01-01" },
      { id: 2, type: "buy" as const, quantity: "10", price: "120", date: "2026-02-01" },
      { id: 3, type: "sell" as const, quantity: "5", price: "150", date: "2026-03-01" },
    ];
    const consolidated = consolidateInvestmentOperations(operations);
    expect(consolidated.quantity).toBe(15);
    expect(consolidated.averagePrice).toBe(110);
    expect(consolidated.realizedProfit).toBe(200);
  });

  it("appends an operation and calculates profitability from market value", () => {
    const updated = appendInvestmentOperation({ ...base, quantity: "0", averagePrice: "0", currentValue: "0", marketPrice: "120", operations: [] }, { id: 1, type: "buy", quantity: "10", price: "100", date: "2026-03-01" }, new Date("2026-03-02T00:00:00.000Z"));
    expect(updated.quantity).toBe("10");
    expect(updated.averagePrice).toBe("100");
    expect(updated.currentValue).toBe("1200");
    expect(investmentProfitability(updated).percent).toBe(20);
  });

  it("consolidates the same ticker across institutions with a weighted average price", () => {
    const consolidated = consolidateInvestmentsByTicker([
      { ...base, id: 10, ticker: "GMAT3", institution: "C6", quantity: "200", averagePrice: "4.48", currentValue: "780" },
      { ...base, id: 11, ticker: "GMAT3", institution: "INTER", quantity: "100", averagePrice: "6.97", currentValue: "390" },
    ]);
    expect(consolidated).toHaveLength(1);
    expect(consolidated[0].ticker).toBe("GMAT3");
    expect(consolidated[0].quantity).toBe("300");
    expect(Number(consolidated[0].averagePrice)).toBeCloseTo((200 * 4.48 + 100 * 6.97) / 300, 8);
    expect(consolidated[0].institution).toBe("C6, INTER");
  });

  it("keeps different tickers as separate cards", () => {
    const consolidated = consolidateInvestmentsByTicker([
      { ...base, id: 10, ticker: "GMAT3", institution: "C6" },
      { ...base, id: 11, ticker: "B3SA3", institution: "INTER" },
    ]);
    expect(consolidated).toHaveLength(2);
  });

  it("rejects invalid positions", () => {
    expect(isLocalInvestment(base)).toBe(true);
    expect(isLocalInvestment({ ...base, category: "unknown" })).toBe(false);
    expect(isLocalInvestment({ ...base, currentValue: "-1" })).toBe(false);
  });
});
