import { describe, expect, it } from "vitest";
import { summarize } from "./finance";

describe("finance summary", () => {
  it("calculates income, expense and balance", () => {
    expect(summarize([
      { type: "income", amount: "2500.00" },
      { type: "expense", amount: 700 },
      { type: "expense", amount: 150.5 },
    ])).toEqual({ income: 2500, expense: 850.5, balance: 1649.5 });
  });

  it("returns zero totals for an empty period", () => {
    expect(summarize([])).toEqual({ income: 0, expense: 0, balance: 0 });
  });
});
