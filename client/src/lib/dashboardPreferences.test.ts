import { beforeEach, describe, expect, it, vi } from "vitest";
import { dashboardWidgetKeys, defaultDashboardWidgetPreferences, loadDashboardWidgetPreferences, resetDashboardWidgetPreferences, saveDashboardWidgetPreferences } from "./dashboardPreferences";

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
  it("returns all widgets enabled in the default order", () => {
    expect(loadDashboardWidgetPreferences()).toEqual(defaultDashboardWidgetPreferences);
  });

  it("persists visibility and custom order for every widget", () => {
    const preferences = { ...defaultDashboardWidgetPreferences, market: false, order: [...dashboardWidgetKeys].reverse() };
    saveDashboardWidgetPreferences(preferences);
    expect(loadDashboardWidgetPreferences()).toEqual(preferences);
  });

  it("normalizes missing and unknown order entries while preserving visibility", () => {
    localStorageMock.setItem("findash-lvo:dashboard-widgets", JSON.stringify({ market: false, order: ["unknown", "currency", "currency"] }));
    const loaded = loadDashboardWidgetPreferences();
    expect(loaded.market).toBe(false);
    expect(loaded.currency).toBe(true);
    expect(loaded.order).toEqual(["currency", ...dashboardWidgetKeys.filter(key => key !== "currency")]);
  });

  it("restores the default visibility and order", () => {
    const preferences = { ...defaultDashboardWidgetPreferences, market: false, currency: false, order: [...dashboardWidgetKeys].reverse() };
    saveDashboardWidgetPreferences(preferences);
    expect(resetDashboardWidgetPreferences()).toEqual(defaultDashboardWidgetPreferences);
    expect(loadDashboardWidgetPreferences()).toEqual(defaultDashboardWidgetPreferences);
  });
});
