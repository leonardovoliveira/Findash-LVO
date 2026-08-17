import { describe, expect, it } from "vitest";
import { dashboardWidgetKeys, type DashboardWidgetKey } from "./dashboardPreferences";

describe("dashboard fixed layout", () => {
  it("declares the complete set of configurable card identifiers", () => {
    expect(dashboardWidgetKeys).toEqual([
      "market",
      "currency",
      "expenses",
      "income",
      "nextInvoice",
      "allocationType",
      "allocationInstitution",
      "periodSummary",
    ] satisfies readonly DashboardWidgetKey[]);
  });

  it("does not contain duplicate widget identifiers", () => {
    expect(new Set(dashboardWidgetKeys).size).toBe(dashboardWidgetKeys.length);
  });
});
