import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultDashboardWidgetPreferences, loadDashboardWidgetPreferences, resetDashboardWidgetPreferences, saveDashboardWidgetPreferences } from "./dashboardPreferences";

const storage = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  clear: () => storage.clear(),
};

beforeEach(() => {
  storage.clear();
  vi.stubGlobal("window", { localStorage: localStorageMock });
});

describe("dashboard widget preferences", () => {
  it("returns both widgets enabled in the default order", () => {
    expect(loadDashboardWidgetPreferences()).toEqual(defaultDashboardWidgetPreferences);
  });

  it("persists visibility and custom order", () => {
    saveDashboardWidgetPreferences({ market: false, currency: true, order: ["currency", "market"] });
    expect(loadDashboardWidgetPreferences()).toEqual({ market: false, currency: true, order: ["currency", "market"] });
  });

  it("normalizes missing and unknown order entries", () => {
    localStorageMock.setItem("findash-lvo:dashboard-widgets", JSON.stringify({ market: false, order: ["unknown", "currency", "currency"] }));
    expect(loadDashboardWidgetPreferences()).toEqual({ market: false, currency: true, order: ["currency", "market"] });
  });

  it("restores the default visibility and order", () => {
    saveDashboardWidgetPreferences({ market: false, currency: false, order: ["currency", "market"] });
    expect(resetDashboardWidgetPreferences()).toEqual(defaultDashboardWidgetPreferences);
    expect(loadDashboardWidgetPreferences()).toEqual(defaultDashboardWidgetPreferences);
  });
});
