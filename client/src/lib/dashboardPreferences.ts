export type DashboardWidgetKey =
  | "market"
  | "currency"
  | "expenses"
  | "income"
  | "nextInvoice"
  | "allocationType"
  | "allocationInstitution"
  | "periodSummary";

export type DashboardWidgetSize = "compact" | "regular" | "wide";
export type DashboardWidgetHeight = "compact" | "regular" | "tall";
export type DashboardLayoutPresetId = "default" | "overview" | "investments";
export type DashboardWidgetPreferences = Record<DashboardWidgetKey, boolean> & {
  order: DashboardWidgetKey[];
  sizes: Record<DashboardWidgetKey, DashboardWidgetSize>;
  heights: Record<DashboardWidgetKey, DashboardWidgetHeight>;
  preset: DashboardLayoutPresetId;
};

export const dashboardWidgetKeys: DashboardWidgetKey[] = ["market", "currency", "expenses", "income", "nextInvoice", "allocationType", "allocationInstitution", "periodSummary"];
const defaultOrder: DashboardWidgetKey[] = ["expenses", "income", "nextInvoice", "allocationType", "allocationInstitution", "market", "currency", "periodSummary"];
const defaultSizes: Record<DashboardWidgetKey, DashboardWidgetSize> = {
  market: "regular", currency: "regular", expenses: "regular", income: "regular", nextInvoice: "regular", allocationType: "regular", allocationInstitution: "regular", periodSummary: "regular",
};
const defaultHeights: Record<DashboardWidgetKey, DashboardWidgetHeight> = {
  market: "regular", currency: "regular", expenses: "regular", income: "regular", nextInvoice: "regular", allocationType: "regular", allocationInstitution: "regular", periodSummary: "regular",
};

export const defaultDashboardWidgetPreferences: DashboardWidgetPreferences = {
  market: true, currency: true, expenses: true, income: true, nextInvoice: true, allocationType: true, allocationInstitution: true, periodSummary: true,
  order: defaultOrder,
  sizes: defaultSizes,
  heights: defaultHeights,
  preset: "default",
};

const storageKey = "findash-lvo:dashboard-widgets";

function normalizeOrder(value: unknown): DashboardWidgetKey[] {
  const parsed = Array.isArray(value) ? value.filter((key): key is DashboardWidgetKey => dashboardWidgetKeys.includes(key as DashboardWidgetKey)) : [];
  return Array.from(new Set([...parsed, ...dashboardWidgetKeys]));
}

function normalizeSizes(value: unknown): Record<DashboardWidgetKey, DashboardWidgetSize> {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return Object.fromEntries(dashboardWidgetKeys.map(key => [key, source[key] === "compact" || source[key] === "wide" ? source[key] : "regular"])) as Record<DashboardWidgetKey, DashboardWidgetSize>;
}
function normalizeHeights(value: unknown): Record<DashboardWidgetKey, DashboardWidgetHeight> {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return Object.fromEntries(dashboardWidgetKeys.map(key => [key, source[key] === "compact" || source[key] === "tall" ? source[key] : "regular"])) as Record<DashboardWidgetKey, DashboardWidgetHeight>;
}

export function loadDashboardWidgetPreferences(): DashboardWidgetPreferences {
  if (typeof window === "undefined") return { ...defaultDashboardWidgetPreferences, order: [...defaultOrder], sizes: { ...defaultSizes }, heights: { ...defaultHeights } };
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return { ...defaultDashboardWidgetPreferences, order: [...defaultOrder], sizes: { ...defaultSizes }, heights: { ...defaultHeights } };
    const parsed = JSON.parse(raw) as Partial<DashboardWidgetPreferences>;
    return {
      ...defaultDashboardWidgetPreferences,
      ...Object.fromEntries(dashboardWidgetKeys.map(key => [key, parsed[key] !== false])),
      order: normalizeOrder(parsed.order),
      sizes: normalizeSizes(parsed.sizes),
      heights: normalizeHeights(parsed.heights),
      preset: parsed.preset === "overview" || parsed.preset === "investments" ? parsed.preset : "default",
    } as DashboardWidgetPreferences;
  } catch {
    return { ...defaultDashboardWidgetPreferences, order: [...defaultOrder], sizes: { ...defaultSizes }, heights: { ...defaultHeights } };
  }
}

export function saveDashboardWidgetPreferences(preferences: DashboardWidgetPreferences) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify({ ...preferences, order: normalizeOrder(preferences.order), sizes: normalizeSizes(preferences.sizes), heights: normalizeHeights(preferences.heights) }));
}

export function resetDashboardWidgetPreferences(): DashboardWidgetPreferences {
  const defaults = { ...defaultDashboardWidgetPreferences, order: [...defaultOrder], sizes: { ...defaultSizes }, heights: { ...defaultHeights }, preset: "default" as const };
  if (typeof window !== "undefined") window.localStorage.setItem(storageKey, JSON.stringify(defaults));
  return defaults;
}

export function applyDashboardLayoutPreset(preset: DashboardLayoutPresetId): DashboardWidgetPreferences {
  const base = resetDashboardWidgetPreferences();
  if (preset === "overview") return { ...base, preset, expenses: true, income: true, nextInvoice: true, market: true, currency: true, allocationType: false, allocationInstitution: false, periodSummary: true, order: ["expenses", "income", "nextInvoice", "market", "currency", "periodSummary", "allocationType", "allocationInstitution"] };
  if (preset === "investments") return { ...base, preset, expenses: false, income: false, nextInvoice: false, market: true, currency: true, allocationType: true, allocationInstitution: true, periodSummary: true, order: ["allocationType", "allocationInstitution", "market", "currency", "periodSummary", "expenses", "income", "nextInvoice"] };
  return base;
}

export const dashboardLayoutPresets: Array<{ id: DashboardLayoutPresetId; label: string; description: string }> = [
  { id: "default", label: "Visão padrão", description: "A organização completa recomendada." },
  { id: "overview", label: "Visão Geral", description: "Prioriza gastos, entradas, faturas e resumo." },
  { id: "investments", label: "Foco em Investimentos", description: "Prioriza distribuições, moedas e patrimônio." },
];

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
