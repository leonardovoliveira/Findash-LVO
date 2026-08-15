export type DashboardWidgetKey = "market" | "currency";

export type DashboardWidgetPreferences = {
  market: boolean;
  currency: boolean;
  order: DashboardWidgetKey[];
};

export const defaultDashboardWidgetPreferences: DashboardWidgetPreferences = {
  market: true,
  currency: true,
  order: ["market", "currency"],
};

const storageKey = "findash-lvo:dashboard-widgets";
const widgetKeys: DashboardWidgetKey[] = ["market", "currency"];

function normalizeOrder(value: unknown): DashboardWidgetKey[] {
  const parsed = Array.isArray(value) ? value.filter((key): key is DashboardWidgetKey => widgetKeys.includes(key as DashboardWidgetKey)) : [];
  return Array.from(new Set([...parsed, ...widgetKeys]));
}

export function loadDashboardWidgetPreferences(): DashboardWidgetPreferences {
  if (typeof window === "undefined") return { ...defaultDashboardWidgetPreferences, order: [...defaultDashboardWidgetPreferences.order] };

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return { ...defaultDashboardWidgetPreferences, order: [...defaultDashboardWidgetPreferences.order] };
    const parsed = JSON.parse(raw) as Partial<DashboardWidgetPreferences>;
    return {
      market: parsed.market !== false,
      currency: parsed.currency !== false,
      order: normalizeOrder(parsed.order),
    };
  } catch {
    return { ...defaultDashboardWidgetPreferences, order: [...defaultDashboardWidgetPreferences.order] };
  }
}

export function saveDashboardWidgetPreferences(preferences: DashboardWidgetPreferences) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify({ ...preferences, order: normalizeOrder(preferences.order) }));
}

export function resetDashboardWidgetPreferences(): DashboardWidgetPreferences {
  const defaults = { ...defaultDashboardWidgetPreferences, order: [...defaultDashboardWidgetPreferences.order] };
  if (typeof window !== "undefined") window.localStorage.setItem(storageKey, JSON.stringify(defaults));
  return defaults;
}

export const dashboardWidgetOptions: Array<{ key: DashboardWidgetKey; label: string; description: string }> = [
  { key: "market", label: "Mercados de referência", description: "Exibe os cards de USD/BRL e BTC/BRL." },
  { key: "currency", label: "Carteira em moedas", description: "Exibe o resumo de posições e categorias em moedas estrangeiras." },
];
