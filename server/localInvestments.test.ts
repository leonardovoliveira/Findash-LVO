import { describe, expect, it } from "vitest";
import { applyInvestmentQuote, createLocalInvestment, investmentCategories, investmentCost, investmentMarketValue, investmentValue, isLocalInvestment, type LocalInvestment } from "../client/src/lib/localInvestments";

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
    const created = createLocalInvestment([base], { ...base, id: undefined as never, createdAt: undefined as never, updatedAt: undefined as never }, new Date("2026-02-01T00:00:00.000Z"));
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
    const updated = applyInvestmentQuote(base, { ok: true, price: 120, source: "brapi.dev", fetchedAt: "2026-08-15T12:00:00.000Z" });
    expect(updated.marketPrice).toBe("120");
    expect(updated.currentValue).toBe("1200");
    expect(updated.quoteSource).toBe("brapi.dev");
    expect(updated.quoteFetchedAt).toBe("2026-08-15T12:00:00.000Z");
    expect(updated.quoteError).toBe("");
  });

  it("keeps the prior value and records a quote fallback error", () => {
    const updated = applyInvestmentQuote(base, { ok: false, source: "brapi.dev", fetchedAt: "2026-08-15T12:01:00.000Z", error: "HTTP 403" });
    expect(updated.currentValue).toBe(base.currentValue);
    expect(updated.quoteError).toBe("HTTP 403");
    expect(updated.quoteSource).toBe("brapi.dev");
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

  it("rejects invalid positions", () => {
    expect(isLocalInvestment(base)).toBe(true);
    expect(isLocalInvestment({ ...base, category: "unknown" })).toBe(false);
    expect(isLocalInvestment({ ...base, currentValue: "-1" })).toBe(false);
  });
});
