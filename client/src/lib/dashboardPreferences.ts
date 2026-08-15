export type DashboardWidgetKey = "market" | "currency";

export type DashboardWidgetPreferences = Record<DashboardWidgetKey, boolean>;

export const defaultDashboardWidgetPreferences: DashboardWidgetPreferences = {
  market: true,
  currency: true,
};

const storageKey = "findash-lvo:dashboard-widgets";

export function loadDashboardWidgetPreferences(): DashboardWidgetPreferences {
  if (typeof window === "undefined") return { ...defaultDashboardWidgetPreferences };

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return { ...defaultDashboardWidgetPreferences };
    const parsed = JSON.parse(raw) as Partial<DashboardWidgetPreferences>;
    return {
      market: parsed.market !== false,
      currency: parsed.currency !== false,
    };
  } catch {
    return { ...defaultDashboardWidgetPreferences };
  }
}

export function saveDashboardWidgetPreferences(preferences: DashboardWidgetPreferences) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(preferences));
}

export function resetDashboardWidgetPreferences(): DashboardWidgetPreferences {
  const defaults = { ...defaultDashboardWidgetPreferences };
  if (typeof window !== "undefined") window.localStorage.setItem(storageKey, JSON.stringify(defaults));
  return defaults;
}

export const dashboardWidgetOptions: Array<{ key: DashboardWidgetKey; label: string; description: string }> = [
  { key: "market", label: "Mercados de referência", description: "Exibe os cards de USD/BRL e BTC/BRL." },
  { key: "currency", label: "Carteira em moedas", description: "Exibe o resumo de posições e categorias em moedas estrangeiras." },
];
