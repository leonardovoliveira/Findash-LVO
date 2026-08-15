export const investmentCategories = [
  { value: "fixed-income", label: "Renda fixa", detail: "CDB, LCI e LCA" },
  { value: "equities", label: "Renda variável", detail: "Ações, ETFs e FIIs" },
  { value: "funds", label: "Fundos de investimentos", detail: "Fundos multimercado e outros" },
  { value: "treasury", label: "Tesouro Direto", detail: "Títulos públicos" },
  { value: "dollar", label: "Investimento em dólar", detail: "Stocks, REITs, ETFs e Bonds" },
  { value: "crypto", label: "Criptomoedas", detail: "Ativos digitais" },
] as const;

export type InvestmentCategory = (typeof investmentCategories)[number]["value"];

export type LocalInvestment = {
  id: number;
  userId: number;
  name: string;
  ticker: string;
  category: InvestmentCategory;
  institution: string;
  quantity: string;
  averagePrice: string;
  /** Valor total de mercado da posição, calculado por quantidade × cotação. */
  currentValue: string;
  /** Cotação unitária retornada pela fonte externa. */
  marketPrice?: string;
  quoteFetchedAt?: string;
  quoteSource?: string;
  quoteError?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_PREFIX = "findash-lvo:investments:";

export function investmentStorageKey(userId: number | string) {
  return `${STORAGE_PREFIX}${userId}`;
}

export function loadLocalInvestments(userId: number | string): LocalInvestment[] {
  try {
    const raw = window.localStorage.getItem(investmentStorageKey(userId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isLocalInvestment) : [];
  } catch {
    return [];
  }
}

export function investmentCost(item: Pick<LocalInvestment, "quantity" | "averagePrice">) {
  const quantity = Number(item.quantity);
  const averagePrice = Number(item.averagePrice);
  return Number.isFinite(quantity) && Number.isFinite(averagePrice) ? quantity * averagePrice : 0;
}

export function investmentValue(item: Pick<LocalInvestment, "currentValue" | "quantity" | "averagePrice">) {
  const currentValue = Number(item.currentValue);
  if (item.currentValue.trim() !== "" && Number.isFinite(currentValue)) return currentValue;
  return investmentCost(item);
}

export type InvestmentQuote = {
  ok: boolean;
  price?: number;
  source: string;
  fetchedAt: string;
  error?: string;
};

export function applyInvestmentQuote(item: LocalInvestment, quote: InvestmentQuote): LocalInvestment {
  if (!quote.ok || !Number.isFinite(quote.price)) {
    return { ...item, quoteFetchedAt: quote.fetchedAt, quoteSource: quote.source, quoteError: quote.error ?? "Cotação indisponível" };
  }
  const price = quote.price ?? 0;
  return {
    ...item,
    marketPrice: String(price),
    currentValue: String(Number(item.quantity || 0) * price),
    quoteFetchedAt: quote.fetchedAt,
    quoteSource: quote.source,
    quoteError: "",
  };
}

export function investmentMarketValue(item: Pick<LocalInvestment, "currentValue" | "quantity" | "averagePrice" | "marketPrice">) {
  const marketPrice = Number(item.marketPrice);
  if (item.marketPrice?.trim() && Number.isFinite(marketPrice)) {
    const quantity = Number(item.quantity);
    return Number.isFinite(quantity) ? quantity * marketPrice : 0;
  }
  return investmentValue(item);
}

export function saveLocalInvestments(userId: number | string, investments: LocalInvestment[]) {
  window.localStorage.setItem(investmentStorageKey(userId), JSON.stringify(investments));
}

export function createLocalInvestment(
  investments: LocalInvestment[],
  input: Omit<LocalInvestment, "id" | "createdAt" | "updatedAt">,
  now = new Date(),
) {
  const iso = now.toISOString();
  return [...investments, { ...input, id: investments.reduce((max, item) => Math.max(max, item.id), 0) + 1, createdAt: iso, updatedAt: iso }];
}

export function isLocalInvestment(value: unknown): value is LocalInvestment {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return Number.isInteger(item.id) && typeof item.userId === "number" && typeof item.name === "string" && item.name.trim().length > 0 && typeof item.ticker === "string" && typeof item.category === "string" && investmentCategories.some(category => category.value === item.category) && typeof item.institution === "string" && typeof item.quantity === "string" && Number(item.quantity) >= 0 && typeof item.averagePrice === "string" && Number(item.averagePrice) >= 0 && typeof item.currentValue === "string" && Number(item.currentValue) >= 0 && (item.marketPrice === undefined || (typeof item.marketPrice === "string" && Number(item.marketPrice) >= 0)) && (item.quoteFetchedAt === undefined || typeof item.quoteFetchedAt === "string") && (item.quoteSource === undefined || typeof item.quoteSource === "string") && (item.quoteError === undefined || typeof item.quoteError === "string") && typeof item.notes === "string";
}
