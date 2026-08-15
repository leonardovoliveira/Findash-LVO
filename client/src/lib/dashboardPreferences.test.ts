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
  it("returns both widgets enabled by default", () => {
    expect(loadDashboardWidgetPreferences()).toEqual(defaultDashboardWidgetPreferences);
  });

  it("persists a disabled widget and restores it", () => {
    saveDashboardWidgetPreferences({ market: false, currency: true });
    expect(loadDashboardWidgetPreferences()).toEqual({ market: false, currency: true });
  });

  it("treats missing values as enabled for forward compatibility", () => {
    localStorageMock.setItem("findash-lvo:dashboard-widgets", JSON.stringify({ market: false }));
    expect(loadDashboardWidgetPreferences()).toEqual({ market: false, currency: true });
  });

  it("restores the default visibility", () => {
    saveDashboardWidgetPreferences({ market: false, currency: false });
    expect(resetDashboardWidgetPreferences()).toEqual(defaultDashboardWidgetPreferences);
    expect(loadDashboardWidgetPreferences()).toEqual(defaultDashboardWidgetPreferences);
  });
});
