export type DashboardWidgetKey =
  | "market"
  | "currency"
  | "expenses"
  | "income"
  | "nextInvoice"
  | "allocationType"
  | "allocationInstitution"
  | "periodSummary";

export type DashboardWidgetPreferences = Record<DashboardWidgetKey, boolean> & {
  order: DashboardWidgetKey[];
};

export const dashboardWidgetKeys: DashboardWidgetKey[] = [
  "market",
  "currency",
  "expenses",
  "income",
  "nextInvoice",
  "allocationType",
  "allocationInstitution",
  "periodSummary",
];

export const defaultDashboardWidgetPreferences: DashboardWidgetPreferences = {
  market: true,
  currency: true,
  expenses: true,
  income: true,
  nextInvoice: true,
  allocationType: true,
  allocationInstitution: true,
  periodSummary: true,
  order: [...dashboardWidgetKeys],
};

const storageKey = "findash-lvo:dashboard-widgets";

function normalizeOrder(value: unknown): DashboardWidgetKey[] {
  const parsed = Array.isArray(value)
    ? value.filter((key): key is DashboardWidgetKey => dashboardWidgetKeys.includes(key as DashboardWidgetKey))
    : [];
  return Array.from(new Set([...parsed, ...dashboardWidgetKeys]));
}

export function loadDashboardWidgetPreferences(): DashboardWidgetPreferences {
  if (typeof window === "undefined") return { ...defaultDashboardWidgetPreferences, order: [...dashboardWidgetKeys] };
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return { ...defaultDashboardWidgetPreferences, order: [...dashboardWidgetKeys] };
    const parsed = JSON.parse(raw) as Partial<DashboardWidgetPreferences>;
    return {
      ...defaultDashboardWidgetPreferences,
      ...Object.fromEntries(dashboardWidgetKeys.map(key => [key, parsed[key] !== false])),
      order: normalizeOrder(parsed.order),
    } as DashboardWidgetPreferences;
  } catch {
    return { ...defaultDashboardWidgetPreferences, order: [...dashboardWidgetKeys] };
  }
}

export function saveDashboardWidgetPreferences(preferences: DashboardWidgetPreferences) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify({ ...preferences, order: normalizeOrder(preferences.order) }));
}

export function resetDashboardWidgetPreferences(): DashboardWidgetPreferences {
  const defaults = { ...defaultDashboardWidgetPreferences, order: [...dashboardWidgetKeys] };
  if (typeof window !== "undefined") window.localStorage.setItem(storageKey, JSON.stringify(defaults));
  return defaults;
}

export const dashboardWidgetOptions: Array<{ key: DashboardWidgetKey; label: string; description: string }> = [
  { key: "market", label: "Moedas de referência", description: "Exibe USD/BRL e BTC/BRL." },
  { key: "currency", label: "Carteira em moedas", description: "Exibe posições em moedas estrangeiras." },
  { key: "expenses", label: "Maiores gastos", description: "Exibe os maiores gastos do período." },
  { key: "income", label: "Maiores entradas", description: "Exibe as maiores entradas do período." },
  { key: "nextInvoice", label: "Próxima fatura", description: "Exibe o resumo da próxima fatura." },
  { key: "allocationType", label: "Investimentos por tipo", description: "Exibe a distribuição por categoria." },
  { key: "allocationInstitution", label: "Investimentos por instituição", description: "Exibe a distribuição por instituição." },
  { key: "periodSummary", label: "Resumo do período", description: "Exibe totais de entradas e saídas." },
];
