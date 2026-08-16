export type DashboardWidgetKey =
  | "balance"
  | "calendar"
  | "rankings"
  | "investment"
  | "allocations"
  | "annualPerformance"
  | "market"
  | "currency"
  | "selectedDay"
  | "periodSummary"
  | "performance";

export type DashboardWidgetPreferences = Record<DashboardWidgetKey, boolean> & {
  order: DashboardWidgetKey[];
};

export const dashboardWidgetKeys: DashboardWidgetKey[] = [
  "balance",
  "calendar",
  "rankings",
  "investment",
  "allocations",
  "annualPerformance",
  "market",
  "currency",
  "selectedDay",
  "periodSummary",
  "performance",
];

export const defaultDashboardWidgetPreferences: DashboardWidgetPreferences = {
  balance: true,
  calendar: true,
  rankings: true,
  investment: true,
  allocations: true,
  annualPerformance: true,
  market: true,
  currency: true,
  selectedDay: true,
  periodSummary: true,
  performance: true,
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
  { key: "balance", label: "Saldo no período", description: "Exibe o saldo consolidado do mês selecionado." },
  { key: "calendar", label: "Calendário financeiro", description: "Mostra dias com entradas e saídas e permite consultar lançamentos." },
  { key: "rankings", label: "Gastos, entradas e próxima fatura", description: "Exibe rankings financeiros e o resumo da próxima fatura." },
  { key: "investment", label: "Carteira de investimentos", description: "Exibe valor de mercado e acesso rápido para cadastrar posições." },
  { key: "allocations", label: "Distribuição dos investimentos", description: "Exibe gráficos por tipo e por instituição." },
  { key: "annualPerformance", label: "Performance anual", description: "Exibe o resultado realizado dos investimentos no ano." },
  { key: "market", label: "Mercados de referência", description: "Exibe os cards de USD/BRL e BTC/BRL." },
  { key: "currency", label: "Carteira em moedas", description: "Exibe o resumo de posições e categorias em moedas estrangeiras." },
  { key: "selectedDay", label: "Lançamentos do dia", description: "Exibe os lançamentos da data selecionada no calendário." },
  { key: "periodSummary", label: "Resumo do período", description: "Exibe totais de entradas e saídas do período." },
  { key: "performance", label: "Performance financeira", description: "Exibe o gráfico de evolução financeira." },
];
