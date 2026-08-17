export type DashboardWidgetKey =
  | "market"
  | "currency"
  | "expenses"
  | "income"
  | "nextInvoice"
  | "allocationType"
  | "allocationInstitution"
  | "periodSummary";

/**
 * Identificadores dos cards opcionais que compõem a linha fixa do dashboard.
 * A visibilidade, a ordem e o dimensionamento não são mais configuráveis pelo usuário.
 */
export const dashboardWidgetKeys: readonly DashboardWidgetKey[] = [
  "market",
  "currency",
  "expenses",
  "income",
  "nextInvoice",
  "allocationType",
  "allocationInstitution",
  "periodSummary",
];
