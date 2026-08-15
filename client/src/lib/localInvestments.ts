export const investmentCategories = [
  { value: "fixed-income", label: "Renda fixa", detail: "CDB, LCI e LCA" },
  { value: "equities", label: "Renda variável", detail: "Ações, ETFs e FIIs" },
  { value: "funds", label: "Fundos de investimentos", detail: "Fundos multimercado e outros" },
  { value: "treasury", label: "Tesouro Direto", detail: "Títulos públicos" },
  { value: "dollar", label: "Investimento em dólar", detail: "Stocks, REITs, ETFs e Bonds" },
  { value: "crypto", label: "Criptomoedas", detail: "Ativos digitais" },
] as const;

export type InvestmentCategory = (typeof investmentCategories)[number]["value"];
export type InvestmentOperationType = "buy" | "sell";

export type InvestmentOperation = {
  id: number;
  type: InvestmentOperationType;
  quantity: string;
  price: string;
  date: string;
};

export type LocalInvestment = {
  id: number;
  userId: number;
  /** Campo legado preservado para importar backups antigos; a interface identifica o ativo pelo ticker. */
  name?: string;
  ticker: string;
  category: InvestmentCategory;
  institution: string;
  quantity: string;
  averagePrice: string;
  /** Valor total de mercado da posição, calculado por quantidade × cotação. */
  currentValue: string;
  /** Cotação unitária retornada pela fonte externa. */
  marketPrice?: string;
  /** Variação percentual diária retornada pela fonte externa. */
  quoteChangePercent?: string;
  quoteFetchedAt?: string;
  quoteSource?: string;
  quoteError?: string;
  /** Histórico de operações usado para consolidar quantidade, PM e resultado realizado. */
  operations?: InvestmentOperation[];
  realizedProfit?: string;
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
  changePercent?: number;
  source: string;
  fetchedAt: string;
  error?: string;
};

export function applyInvestmentQuote(item: LocalInvestment, quote: InvestmentQuote): LocalInvestment {
  if (!quote.ok || !Number.isFinite(quote.price)) {
    return { ...item, quoteFetchedAt: quote.fetchedAt, quoteSource: item.quoteSource, quoteError: quote.error ?? "Cotação indisponível" };
  }
  const price = quote.price ?? 0;
  return {
    ...item,
    marketPrice: String(price),
    quoteChangePercent: Number.isFinite(quote.changePercent) ? String(quote.changePercent) : item.quoteChangePercent,
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

export function consolidateInvestmentOperations(operations: InvestmentOperation[]) {
  let quantity = 0;
  let costBasis = 0;
  let realizedProfit = 0;
  let totalBought = 0;
  let totalSold = 0;
  const ordered = [...operations].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
  for (const operation of ordered) {
    const operationQuantity = Number(operation.quantity);
    const operationPrice = Number(operation.price);
    if (!Number.isFinite(operationQuantity) || operationQuantity <= 0 || !Number.isFinite(operationPrice) || operationPrice < 0) continue;
    if (operation.type === "buy") {
      quantity += operationQuantity;
      costBasis += operationQuantity * operationPrice;
      totalBought += operationQuantity;
    } else {
      const soldQuantity = Math.min(operationQuantity, quantity);
      const averageBeforeSale = quantity > 0 ? costBasis / quantity : 0;
      quantity -= soldQuantity;
      costBasis -= soldQuantity * averageBeforeSale;
      realizedProfit += soldQuantity * (operationPrice - averageBeforeSale);
      totalSold += soldQuantity;
    }
  }
  return {
    quantity,
    averagePrice: quantity > 0 ? costBasis / quantity : 0,
    costBasis: Math.max(costBasis, 0),
    realizedProfit,
    totalBought,
    totalSold,
  };
}

export function appendInvestmentOperation(item: LocalInvestment, operation: InvestmentOperation, now = new Date()): LocalInvestment {
  const operations = [...(item.operations ?? []), operation];
  const consolidated = consolidateInvestmentOperations(operations);
  const marketPrice = Number(item.marketPrice);
  return {
    ...item,
    operations,
    quantity: String(consolidated.quantity),
    averagePrice: String(consolidated.averagePrice),
    currentValue: item.marketPrice?.trim() && Number.isFinite(marketPrice) ? String(consolidated.quantity * marketPrice) : String(consolidated.costBasis),
    realizedProfit: String(consolidated.realizedProfit),
    updatedAt: now.toISOString(),
  };
}

export function investmentProfitability(item: LocalInvestment) {
  const marketValue = investmentMarketValue(item);
  const costBasis = investmentCost(item);
  const realizedProfit = Number(item.realizedProfit ?? 0);
  const profit = marketValue - costBasis + (Number.isFinite(realizedProfit) ? realizedProfit : 0);
  return { profit, percent: costBasis > 0 ? (profit / costBasis) * 100 : 0 };
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
  const validOperations = item.operations === undefined || (Array.isArray(item.operations) && item.operations.every(operation => {
    if (!operation || typeof operation !== "object") return false;
    const entry = operation as Record<string, unknown>;
    return Number.isInteger(entry.id) && (entry.type === "buy" || entry.type === "sell") && typeof entry.quantity === "string" && Number(entry.quantity) > 0 && typeof entry.price === "string" && Number(entry.price) >= 0 && typeof entry.date === "string";
  }));
  return Number.isInteger(item.id) && typeof item.userId === "number" && (item.name === undefined || typeof item.name === "string") && typeof item.ticker === "string" && typeof item.category === "string" && investmentCategories.some(category => category.value === item.category) && typeof item.institution === "string" && typeof item.quantity === "string" && Number(item.quantity) >= 0 && typeof item.averagePrice === "string" && Number(item.averagePrice) >= 0 && typeof item.currentValue === "string" && Number(item.currentValue) >= 0 && (item.marketPrice === undefined || (typeof item.marketPrice === "string" && Number(item.marketPrice) >= 0)) && (item.quoteChangePercent === undefined || (typeof item.quoteChangePercent === "string" && Number.isFinite(Number(item.quoteChangePercent)))) && (item.quoteFetchedAt === undefined || typeof item.quoteFetchedAt === "string") && (item.quoteSource === undefined || typeof item.quoteSource === "string") && (item.quoteError === undefined || typeof item.quoteError === "string") && (item.realizedProfit === undefined || (typeof item.realizedProfit === "string" && Number.isFinite(Number(item.realizedProfit)))) && validOperations && typeof item.notes === "string";
}
