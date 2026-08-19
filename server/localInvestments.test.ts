import { describe, expect, it } from "vitest";
import { appendInvestmentOperation, applyInvestmentQuote, consolidateInvestmentOperations, consolidateInvestmentsByTicker, createLocalInvestment, investmentAccruedValue, investmentCategories, investmentCost, investmentMarketValue, investmentPerformanceHistory, investmentProfitability, investmentValue, investmentValueAtDate, isLocalInvestment, normalizeInstitutionName, recordDailyInvestmentHistory, recalculateConsolidatedInvestment, type LocalInvestment } from "../client/src/lib/localInvestments";

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

  it("keeps an existing legacy balance when an application is added to a position without operations", () => {
    const updated = appendInvestmentOperation({ ...base, quantity: "5", averagePrice: "100", currentValue: "600", marketPrice: "120" }, { id: 2, type: "buy", quantity: "2", price: "110", date: "2026-03-01", institution: "Corretora" }, new Date("2026-03-02T00:00:00.000Z"));
    expect(updated.quantity).toBe("7");
    expect(Number(updated.averagePrice)).toBeCloseTo((5 * 100 + 2 * 110) / 7, 8);
    expect(updated.operations).toHaveLength(2);
    expect(updated.currentValue).toBe("840");
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

  it("merges institution names without differentiating case", () => {
    const consolidated = consolidateInvestmentsByTicker([
      { ...base, id: 12, ticker: "BTHF11", institution: "Inter", quantity: "10", averagePrice: "100", currentValue: "1000" },
      { ...base, id: 13, ticker: "BTHF11", institution: "INTER", quantity: "5", averagePrice: "120", currentValue: "600" },
    ]);
    expect(normalizeInstitutionName(" INTER ")).toBe("inter");
    expect(consolidated[0].institution).toBe("Inter");
    expect(consolidated[0].institutionDetails).toHaveLength(1);
    expect(consolidated[0].institutionDetails?.[0].quantity).toBe("15");
  });

  it("recalculates a consolidated position after editing one institution", () => {
    const [item] = consolidateInvestmentsByTicker([
      { ...base, id: 10, ticker: "GMAT3", institution: "C6", quantity: "200", averagePrice: "4.48", currentValue: "780" },
      { ...base, id: 11, ticker: "GMAT3", institution: "INTER", quantity: "100", averagePrice: "6.97", currentValue: "390" },
    ]);
    const updated = recalculateConsolidatedInvestment(item, (item.institutionDetails ?? []).map((detail, index) => index === 1 ? { ...detail, quantity: "120", averagePrice: "7.10", costBasis: "852", currentValue: "900" } : detail));
    expect(updated.quantity).toBe("320");
    expect(Number(updated.averagePrice)).toBeCloseTo((200 * 4.48 + 120 * 7.10) / 320, 8);
    expect(updated.institution).toBe("C6, INTER");
  });

  it("calculates contracted fixed-income profitability from a benchmark", () => {
    const result = investmentProfitability({ ...base, category: "fixed-income", contractedRate: "100", contractedBenchmark: "CDI", benchmarkAnnualRate: "10.5", quantity: "10", averagePrice: "100", currentValue: "1050" });
    expect(result.contractedAnnualPercent).toBeCloseTo(10.5, 8);
    expect(result.contractedProfit).toBeCloseTo(105, 8);
  });

  it("adds the contracted real rate to IPCA for treasury profitability", () => {
    const result = investmentProfitability({ ...base, category: "treasury", contractedRate: "6", contractedBenchmark: "IPCA+", benchmarkAnnualRate: "4.5", quantity: "10", averagePrice: "100", currentValue: "1000" });
    expect(result.contractedAnnualPercent).toBeCloseTo(10.5, 8);
    expect(result.contractedProfit).toBeCloseTo(105, 8);
  });

  it("calculates accrued value for contracted fixed income instead of keeping a zero current value", () => {
    const asOf = new Date("2027-01-01T00:00:00.000Z");
    const item = { ...base, category: "fixed-income" as const, currentValue: "0", contractedRate: "100", contractedBenchmark: "CDI" as const, benchmarkAnnualRate: "10", createdAt: "2026-01-01T00:00:00.000Z" };
    expect(investmentAccruedValue(item, asOf)).toBeGreaterThan(1000);
    expect(investmentMarketValue(item)).toBeGreaterThan(1000);
  });

  it("consolidates repeated institution details into one non-zero detail", () => {
    const [item] = consolidateInvestmentsByTicker([
      { ...base, id: 10, ticker: "CDB", institution: "C6", quantity: "1", averagePrice: "486", currentValue: "486" },
      { ...base, id: 11, ticker: "CDB", institution: "C6", quantity: "4", averagePrice: "828.5", currentValue: "3314" },
    ]);
    expect(item.institutionDetails).toHaveLength(1);
    expect(item.institutionDetails?.[0].institution).toBe("C6");
    expect(Number(item.institutionDetails?.[0].quantity)).toBe(5);
    expect(Number(item.institutionDetails?.[0].currentValue)).toBeGreaterThan(0);
  });

  it("creates local performance history when remote history is unavailable", () => {
    const history = investmentPerformanceHistory({ ...base, operations: [{ id: 1, type: "buy", quantity: "10", price: "100", date: "2026-08-01" }], createdAt: "2026-08-01T00:00:00.000Z" }, "1mo", new Date("2026-08-17T00:00:00.000Z"));
    expect(history.length).toBeGreaterThanOrEqual(2);
    expect(history.at(-1)?.close).toBe(1050);
  });

  it("persists one daily point and replaces the same date instead of duplicating it", () => {
    const dated = new Date("2026-08-17T12:00:00.000Z");
    const item = { ...base, currentValue: "1200", dailyHistory: [{ date: "2026-08-16", value: "1100" }] };
    const first = recordDailyInvestmentHistory([item], dated)[0];
    const second = recordDailyInvestmentHistory([{ ...first, currentValue: "1250" }], dated)[0];
    expect(second.dailyHistory).toHaveLength(2);
    expect(second.dailyHistory?.find(point => point.date === "2026-08-17")?.value).toBe("1250");
  });

  it("uses the USD label value separately from the BRL portfolio value", () => {
    const item = { ...base, category: "dollar" as const, quantity: "1", averagePrice: "650", currentValue: "3250", marketPrice: "650", fxRate: "5" };
    expect(Number(item.marketPrice)).toBe(650);
    expect(investmentMarketValue(item)).toBe(3250);
  });

  it("converts dollar positions to BRL using the current USD/BRL rate", () => {
    const item = { ...base, category: "dollar" as const, quantity: "2", averagePrice: "100", currentValue: "200", marketPrice: "120", fxRate: "5" };
    expect(investmentCost(item)).toBe(1000);
    expect(investmentMarketValue(item)).toBe(1200);
  });

  it("converts a dollar quote into BRL instead of only changing its display currency", () => {
    const item = { ...base, category: "dollar" as const, quantity: "2", currentValue: "0", fxRate: "5" };
    const updated = applyInvestmentQuote(item, { ok: true, price: 120, source: "brapi.dev", fetchedAt: "2026-08-17T12:00:00.000Z" }, 5);
    expect(updated.marketPrice).toBe("120");
    expect(updated.currentValue).toBe("1200");
    expect(updated.fxRate).toBe("5");
  });

  it("preserves the USD unit price as the average price after a purchase", () => {
    const item = { ...base, category: "dollar" as const, quantity: "0", averagePrice: "0", currentValue: "0", fxRate: "5", operations: [] };
    const updated = appendInvestmentOperation(item, { id: 1, type: "buy", quantity: "24", price: "12.29", date: "2026-08-19" });
    expect(Number(updated.averagePrice)).toBeCloseTo(12.29, 8);
    expect(investmentCost(updated)).toBeCloseTo(1474.8, 8);
    expect(Number(updated.currentValue)).toBeCloseTo(1474.8, 8);
  });

  it("resolves a historical USD point using its own FX rate", () => {
    const item = { ...base, category: "dollar" as const, quantity: "1", averagePrice: "650", currentValue: "3250", marketPrice: "650", fxRate: "5", dailyHistory: [{ date: "2026-08-10", value: "650", currency: "USD" as const, fxRate: "5" }] };
    expect(investmentValueAtDate(item, new Date("2026-08-10T12:00:00.000Z"))).toBe(3250);
  });

  it("persists daily dollar history in BRL", () => {
    const item = { ...base, category: "dollar" as const, currentValue: "1200", marketPrice: "120", quantity: "2", fxRate: "5" };
    const [updated] = recordDailyInvestmentHistory([item], new Date("2026-08-17T12:00:00.000Z"));
    expect(updated.dailyHistory?.at(-1)).toMatchObject({ value: "1200", currency: "BRL" });
  });

  it("separates asset-price and FX effects in dollar history", () => {
    const item = { ...base, category: "dollar" as const, fxRate: "5", dailyHistory: [
      { date: "2026-08-10", value: "500", currency: "BRL" as const, assetValue: "100", fxRate: "5" },
      { date: "2026-08-17", value: "660", currency: "BRL" as const, assetValue: "110", fxRate: "6" },
    ] };
    const history = investmentPerformanceHistory(item, "1mo", new Date("2026-08-17T12:00:00.000Z"));
    expect(history.at(-1)).toMatchObject({ close: 660, assetEffect: 550, fxEffect: 600 });
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
