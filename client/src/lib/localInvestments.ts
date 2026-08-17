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
export type ContractedBenchmark = "none" | "CDI" | "IPCA+" | "Prefixado";

export type InvestmentOperation = {
  id: number;
  type: InvestmentOperationType;
  quantity: string;
  price: string;
  date: string;
};

export type InvestmentHistoryPoint = { date: string; value: string; currency?: "BRL" | "USD"; assetValue?: string; fxRate?: string };

export type InvestmentInstitutionDetail = {
  institution: string;
  quantity: string;
  averagePrice: string;
  costBasis: string;
  currentValue: string;
  profit: string;
  profitabilityPercent: string;
  contractedRate?: string;
  contractedBenchmark?: ContractedBenchmark;
  benchmarkAnnualRate?: string;
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
  /** Cotação USD/BRL usada para converter posições em dólar. */
  fxRate?: string;
  /** Pontos diários persistidos para o gráfico local. */
  dailyHistory?: InvestmentHistoryPoint[];
  /** Percentual contratado sobre o benchmark ou taxa anual prefixada. */
  contractedRate?: string;
  /** Benchmark contratado para renda fixa. */
  contractedBenchmark?: ContractedBenchmark;
  /** Taxa anual atual do benchmark, quando informada manualmente. */
  benchmarkAnnualRate?: string;
  /** Variação percentual diária retornada pela fonte externa. */
  quoteChangePercent?: string;
  /** Preço de fechamento do pregão anterior retornado pela fonte externa. */
  quotePreviousClose?: string;
  quoteFetchedAt?: string;
  quoteSource?: string;
  quoteError?: string;
  /** Histórico de operações usado para consolidar quantidade, PM e resultado realizado. */
  operations?: InvestmentOperation[];
  /** Detalhamento original por instituição quando o ticker foi consolidado. */
  institutionDetails?: InvestmentInstitutionDetail[];
  realizedProfit?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_PREFIX = "findash-lvo:investments:";

export function investmentStorageKey(userId: number | string) {
  return `${STORAGE_PREFIX}${userId}`;
}

function mergeInstitutionDetails(details: InvestmentInstitutionDetail[], marketPrice?: string, conversionRate = 1) {
  const grouped = new Map<string, InvestmentInstitutionDetail>();
  const quote = Number(marketPrice);
  for (const detail of details) {
    const key = detail.institution.trim().toUpperCase() || "SEM INSTITUIÇÃO";
    const quantity = Number(detail.quantity) || 0;
    const costBasis = Number(detail.costBasis) || quantity * (Number(detail.averagePrice) || 0);
    const currentValue = Number.isFinite(quote) && String(marketPrice ?? "").trim() ? quantity * quote * conversionRate : (Number(detail.currentValue) > 0 ? Number(detail.currentValue) : costBasis);
    const previous = grouped.get(key);
    if (!previous) {
      grouped.set(key, { ...detail, institution: detail.institution.trim(), quantity: String(quantity), averagePrice: String(quantity > 0 ? costBasis / quantity : 0), costBasis: String(costBasis), currentValue: String(currentValue), profit: String(currentValue - costBasis), profitabilityPercent: costBasis > 0 ? String(((currentValue - costBasis) / costBasis) * 100) : "0" });
      continue;
    }
    const totalQuantity = Number(previous.quantity) + quantity;
    const totalCost = Number(previous.costBasis) + costBasis;
    const totalCurrent = Number(previous.currentValue) + currentValue;
    grouped.set(key, { ...previous, quantity: String(totalQuantity), averagePrice: String(totalQuantity > 0 ? totalCost / totalQuantity : 0), costBasis: String(totalCost), currentValue: String(totalCurrent), profit: String(totalCurrent - totalCost), profitabilityPercent: totalCost > 0 ? String(((totalCurrent - totalCost) / totalCost) * 100) : "0", contractedRate: detail.contractedRate ?? previous.contractedRate, contractedBenchmark: detail.contractedBenchmark ?? previous.contractedBenchmark, benchmarkAnnualRate: detail.benchmarkAnnualRate ?? previous.benchmarkAnnualRate });
  }
  return Array.from(grouped.values());
}

export function consolidateInvestmentsByTicker(investments: LocalInvestment[]): LocalInvestment[] {
  const groups = new Map<string, LocalInvestment[]>();
  const result: LocalInvestment[] = [];
  for (const item of investments) {
    const ticker = item.ticker.trim().toUpperCase();
    if (!ticker) { result.push(item); continue; }
    const key = ticker;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  for (const group of Array.from(groups.values())) {
    if (group.length === 1) { result.push(group[0]); continue; }
    const first = group[0];
    const quantity = group.reduce((sum: number, item: LocalInvestment) => sum + (Number(item.quantity) || 0), 0);
    const costBasis = group.reduce((sum: number, item: LocalInvestment) => sum + investmentCost(item), 0);
    const latestQuote = [...group].filter(item => item.quoteFetchedAt).sort((a, b) => String(b.quoteFetchedAt).localeCompare(String(a.quoteFetchedAt)))[0];
    const marketPrice = latestQuote?.marketPrice ?? group.find((item: LocalInvestment) => item.marketPrice?.trim())?.marketPrice;
    const conversionRate = first.category === "dollar" ? (Number(latestQuote?.fxRate ?? first.fxRate) || 1) : 1;
    const institutionDetails = mergeInstitutionDetails(group.flatMap((item: LocalInvestment) => item.institutionDetails?.length ? item.institutionDetails : [{ institution: item.institution, quantity: item.quantity, averagePrice: item.averagePrice, costBasis: String(investmentCost(item)), currentValue: String(investmentMarketValue(item)), profit: String(investmentProfitability(item).profit), profitabilityPercent: String(investmentProfitability(item).percent), contractedRate: item.contractedRate, contractedBenchmark: item.contractedBenchmark, benchmarkAnnualRate: item.benchmarkAnnualRate }]), marketPrice, conversionRate);
    const institutions = Array.from(new Set(institutionDetails.map((detail: InvestmentInstitutionDetail) => detail.institution.trim()).filter(Boolean))).join(", ");
    const operations = group.flatMap((item: LocalInvestment) => item.operations ?? []).map((operation: InvestmentOperation, index: number) => ({ ...operation, id: operation.id + index * 1000000 }));
    const dailyHistory = Array.from(group.flatMap(item => item.dailyHistory ?? []).reduce((map, point) => map.set(point.date, String((Number(map.get(point.date)) || 0) + (Number(point.value) || 0))), new Map<string, string>()).entries()).sort(([a], [b]) => a.localeCompare(b)).slice(-730).map(([date, value]) => ({ date, value }));
    result.push({
      ...first,
      ticker: first.ticker.trim().toUpperCase(),
      institution: institutions || first.institution,
      institutionDetails,
      quantity: String(quantity),
      averagePrice: String(quantity > 0 ? costBasis / quantity : 0),
      currentValue: marketPrice?.trim() && Number.isFinite(Number(marketPrice)) ? String(quantity * Number(marketPrice) * (first.category === "dollar" ? (Number(first.fxRate) || 1) : 1)) : String(investmentAccruedValue({ ...first, quantity: String(quantity), averagePrice: String(quantity > 0 ? costBasis / quantity : 0) })),
      marketPrice,
      fxRate: latestQuote?.fxRate ?? first.fxRate,
      dailyHistory,
      quoteChangePercent: latestQuote?.quoteChangePercent ?? first.quoteChangePercent,
      quotePreviousClose: latestQuote?.quotePreviousClose ?? first.quotePreviousClose,
      quoteFetchedAt: latestQuote?.quoteFetchedAt ?? first.quoteFetchedAt,
      quoteSource: latestQuote?.quoteSource ?? first.quoteSource,
      quoteError: latestQuote?.quoteError ?? first.quoteError,
      operations: operations.length ? operations : undefined,
      realizedProfit: String(group.reduce((sum: number, item: LocalInvestment) => sum + (Number(item.realizedProfit) || 0), 0)),
      contractedRate: first.contractedRate,
      contractedBenchmark: first.contractedBenchmark,
      benchmarkAnnualRate: first.benchmarkAnnualRate,
      notes: Array.from(new Set(group.map((item: LocalInvestment) => item.notes.trim()).filter(Boolean))).join(" · "),
      updatedAt: group.map((item: LocalInvestment) => item.updatedAt).sort().at(-1) ?? first.updatedAt,
    });
  }
  return result;
}

export function recalculateConsolidatedInvestment(item: LocalInvestment, details: InvestmentInstitutionDetail[], overrides: Partial<LocalInvestment> = {}): LocalInvestment {
  const quantity = details.reduce((sum, detail) => sum + (Number(detail.quantity) || 0), 0);
  const costBasis = details.reduce((sum, detail) => sum + (Number(detail.costBasis) || (Number(detail.quantity) || 0) * (Number(detail.averagePrice) || 0)), 0);
  const marketPrice = Number(item.marketPrice);
  const institutions = Array.from(new Set(details.map(detail => detail.institution.trim()).filter(Boolean))).join(", ");
  const updatedDetails = mergeInstitutionDetails(details, item.marketPrice, item.category === "dollar" ? (Number(item.fxRate) || 1) : 1).map(detail => {
    const detailCost = Number(detail.costBasis) || (Number(detail.quantity) || 0) * (Number(detail.averagePrice) || 0);
    const detailCurrent = Number(detail.currentValue) || detailCost;
    const detailProfit = detailCurrent - detailCost;
    return { ...detail, costBasis: String(detailCost), currentValue: String(detailCurrent), profit: String(detailProfit), profitabilityPercent: detailCost > 0 ? String((detailProfit / detailCost) * 100) : "0" };
  });
  const conversionRate = item.category === "dollar" ? (Number(item.fxRate) || 1) : 1;
  return { ...item, ...overrides, institution: institutions || item.institution, institutionDetails: updatedDetails, quantity: String(quantity), averagePrice: String(quantity > 0 ? costBasis / quantity : 0), currentValue: Number.isFinite(marketPrice) && item.marketPrice?.trim() ? String(quantity * marketPrice * conversionRate) : String(costBasis), updatedAt: new Date().toISOString() };
}

export function loadLocalInvestments(userId: number | string): LocalInvestment[] {
  try {
    const raw = window.localStorage.getItem(investmentStorageKey(userId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? consolidateInvestmentsByTicker(parsed.filter(isLocalInvestment)) : [];
  } catch {
    return [];
  }
}

export function investmentCost(item: Pick<LocalInvestment, "quantity" | "averagePrice"> & Partial<Pick<LocalInvestment, "category" | "fxRate">>) {
  const quantity = Number(item.quantity);
  const averagePrice = Number(item.averagePrice);
  const fxRate = item.category === "dollar" ? (Number(item.fxRate) || 1) : 1;
  return Number.isFinite(quantity) && Number.isFinite(averagePrice) && Number.isFinite(fxRate) ? quantity * averagePrice * fxRate : 0;
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
  previousClose?: number;
  source: string;
  fetchedAt: string;
  error?: string;
};

export function applyInvestmentQuote(item: LocalInvestment, quote: InvestmentQuote, fxRate?: number): LocalInvestment {
  if (!quote.ok || !Number.isFinite(quote.price)) {
    return { ...item, quoteFetchedAt: quote.fetchedAt, quoteSource: item.quoteSource, quoteError: quote.error ?? "Cotação indisponível" };
  }
  const price = quote.price ?? 0;
  const conversionRate = item.category === "dollar" ? (Number(fxRate ?? item.fxRate) || 1) : 1;
  return {
    ...item,
    marketPrice: String(price),
    quoteChangePercent: Number.isFinite(quote.changePercent) ? String(quote.changePercent) : item.quoteChangePercent,
    quotePreviousClose: Number.isFinite(quote.previousClose) ? String(quote.previousClose) : item.quotePreviousClose,
    currentValue: String(Number(item.quantity || 0) * price * conversionRate),
    fxRate: item.category === "dollar" && conversionRate > 1 ? String(conversionRate) : item.fxRate,
    quoteFetchedAt: quote.fetchedAt,
    quoteSource: quote.source,
    quoteError: "",
  };
}

function getContractedAnnualPercent(item: Pick<LocalInvestment, "contractedRate" | "contractedBenchmark" | "benchmarkAnnualRate">) {
  const contractedRate = Number(item.contractedRate ?? 0);
  const benchmarkAnnualRate = Number(item.benchmarkAnnualRate ?? 0);
  if (!Number.isFinite(contractedRate) || !Number.isFinite(benchmarkAnnualRate)) return 0;
  if (item.contractedBenchmark === "Prefixado") return Math.max(0, contractedRate);
  if (item.contractedBenchmark === "IPCA+") return Math.max(0, contractedRate + benchmarkAnnualRate);
  if (item.contractedBenchmark === "CDI") return contractedRate > 0 && benchmarkAnnualRate > 0 ? (contractedRate / 100) * benchmarkAnnualRate : 0;
  return 0;
}

export function investmentAccruedValue(item: LocalInvestment, asOf = new Date()) {
  const annualPercent = getContractedAnnualPercent(item);
  const costBasis = investmentCost(item);
  if (annualPercent <= 0 || costBasis <= 0) return investmentValue(item);
  const start = Date.parse(item.createdAt || "");
  const elapsedDays = Number.isFinite(start) ? Math.max(0, (asOf.getTime() - start) / 86400000) : 0;
  return costBasis * Math.pow(1 + annualPercent / 100, elapsedDays / 365);
}

export function investmentMarketValue(item: Pick<LocalInvestment, "currentValue" | "quantity" | "averagePrice" | "marketPrice"> & Partial<Pick<LocalInvestment, "category" | "fxRate" | "contractedRate" | "contractedBenchmark" | "benchmarkAnnualRate" | "createdAt">>) {
  const marketPrice = Number(item.marketPrice);
  if (item.marketPrice?.trim() && Number.isFinite(marketPrice)) {
    const quantity = Number(item.quantity);
    const fxRate = item.category === "dollar" ? (Number(item.fxRate) || 1) : 1;
    return Number.isFinite(quantity) ? quantity * marketPrice * fxRate : 0;
  }
  return investmentAccruedValue({ ...(item as LocalInvestment), category: item.category ?? "fixed-income", contractedRate: item.contractedRate, contractedBenchmark: item.contractedBenchmark, benchmarkAnnualRate: item.benchmarkAnnualRate, createdAt: item.createdAt ?? new Date().toISOString() });
}

export function investmentPerformanceHistory(item: LocalInvestment, range: "1mo" | "6mo" | "1y", asOf = new Date()): Array<{ date: number; close: number; assetEffect?: number; fxEffect?: number }> {
  const months = range === "1mo" ? 1 : range === "6mo" ? 6 : 12;
  const cutoff = new Date(asOf);
  cutoff.setMonth(cutoff.getMonth() - months);
  const historyConversionRate = item.category === "dollar" ? (Number(item.fxRate) || 1) : 1;
  const persisted = (item.dailyHistory ?? []).filter(point => point.date >= cutoff.toISOString().slice(0, 10) && point.date <= asOf.toISOString().slice(0, 10)).map(point => ({ date: Date.parse(`${point.date}T12:00:00Z`) / 1000, close: Number(point.value) * (item.category === "dollar" && point.currency !== "BRL" ? historyConversionRate : 1), assetNominal: Number(point.assetValue), fxRate: Number(point.fxRate) })).filter(point => Number.isFinite(point.close));
  if (persisted.length >= 2) {
    if (item.category !== "dollar") return persisted.map(({ date, close }) => ({ date, close }));
    const firstWithBreakdown = persisted.find(point => Number.isFinite(point.assetNominal) && point.assetNominal > 0 && Number.isFinite(point.fxRate) && point.fxRate > 0);
    if (!firstWithBreakdown) return persisted.map(({ date, close }) => ({ date, close }));
    const baselineAsset = firstWithBreakdown.assetNominal as number;
    const baselineFx = firstWithBreakdown.fxRate as number;
    return persisted.map(point => ({ date: point.date, close: point.close, assetEffect: Number.isFinite(point.assetNominal) ? point.assetNominal * baselineFx : undefined, fxEffect: Number.isFinite(point.fxRate) ? baselineAsset * point.fxRate : undefined }));
  }
  const operations = [...(item.operations ?? [])].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
  const points = new Map<string, number>();
  let quantity = 0;
  let costBasis = 0;
  for (const operation of operations) {
    const date = new Date(`${operation.date}T12:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date < cutoff || date > asOf) continue;
    const opQuantity = Number(operation.quantity);
    const opPrice = Number(operation.price);
    if (!Number.isFinite(opQuantity) || !Number.isFinite(opPrice)) continue;
    if (operation.type === "buy") {
      quantity += opQuantity;
      costBasis += opQuantity * opPrice * (item.category === "dollar" ? (Number(item.fxRate) || 1) : 1);
    } else {
      const sold = Math.min(opQuantity, quantity);
      costBasis -= sold * (quantity > 0 ? costBasis / quantity : 0);
      quantity -= sold;
    }
    points.set(date.toISOString().slice(0, 10), Math.max(0, costBasis));
  }
  if (!points.size) {
    const created = new Date(item.createdAt);
    if (Number.isFinite(created.getTime()) && created <= asOf) points.set(created.toISOString().slice(0, 10), investmentCost(item));
  }
  points.set(asOf.toISOString().slice(0, 10), investmentMarketValue(item));
  return Array.from(points.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, close]) => ({ date: Date.parse(`${date}T12:00:00Z`) / 1000, close }));
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
    currentValue: item.marketPrice?.trim() && Number.isFinite(marketPrice) ? String(consolidated.quantity * marketPrice * (item.category === "dollar" ? (Number(item.fxRate) || 1) : 1)) : String(consolidated.costBasis),
    realizedProfit: String(consolidated.realizedProfit),
    updatedAt: now.toISOString(),
  };
}

export function investmentProfitability(item: LocalInvestment) {
  const marketValue = investmentMarketValue(item);
  const costBasis = investmentCost(item);
  const realizedProfit = Number(item.realizedProfit ?? 0);
  const profit = marketValue - costBasis + (Number.isFinite(realizedProfit) ? realizedProfit : 0);
  const contractedAnnualPercent = getContractedAnnualPercent(item);
  const contractedProfit = costBasis > 0 && contractedAnnualPercent > 0 ? costBasis * contractedAnnualPercent / 100 : 0;
  return { profit, percent: costBasis > 0 ? (profit / costBasis) * 100 : 0, contractedProfit, contractedAnnualPercent };
}

export function recordDailyInvestmentHistory(investments: LocalInvestment[], now = new Date()) {
  const date = now.toISOString().slice(0, 10);
  return investments.map(item => {
    const value = investmentMarketValue(item);
    const assetNominal = item.category === "dollar" && item.marketPrice?.trim() ? Number(item.quantity || 0) * Number(item.marketPrice) : undefined;
    const history = [...(item.dailyHistory ?? []).filter(point => point.date !== date), { date, value: String(value), currency: "BRL" as const, assetValue: Number.isFinite(assetNominal) ? String(assetNominal) : undefined, fxRate: item.category === "dollar" ? item.fxRate : undefined }].sort((a, b) => a.date.localeCompare(b.date)).slice(-730);
    return { ...item, dailyHistory: history };
  });
}

export function saveLocalInvestments(userId: number | string, investments: LocalInvestment[]) {
  window.localStorage.setItem(investmentStorageKey(userId), JSON.stringify(consolidateInvestmentsByTicker(recordDailyInvestmentHistory(investments))));
}

export function createLocalInvestment(
  investments: LocalInvestment[],
  input: Omit<LocalInvestment, "id" | "createdAt" | "updatedAt">,
  now = new Date(),
) {
  const iso = now.toISOString();
  return consolidateInvestmentsByTicker([...investments, { ...input, id: investments.reduce((max, item) => Math.max(max, item.id), 0) + 1, createdAt: iso, updatedAt: iso }]);
}

export function isLocalInvestment(value: unknown): value is LocalInvestment {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  const validOperations = item.operations === undefined || (Array.isArray(item.operations) && item.operations.every(operation => {
    if (!operation || typeof operation !== "object") return false;
    const entry = operation as Record<string, unknown>;
    return Number.isInteger(entry.id) && (entry.type === "buy" || entry.type === "sell") && typeof entry.quantity === "string" && Number(entry.quantity) > 0 && typeof entry.price === "string" && Number(entry.price) >= 0 && typeof entry.date === "string";
  }));
  return Number.isInteger(item.id) && typeof item.userId === "number" && (item.name === undefined || typeof item.name === "string") && typeof item.ticker === "string" && typeof item.category === "string" && investmentCategories.some(category => category.value === item.category) && typeof item.institution === "string" && typeof item.quantity === "string" && Number(item.quantity) >= 0 && typeof item.averagePrice === "string" && Number(item.averagePrice) >= 0 && typeof item.currentValue === "string" && Number(item.currentValue) >= 0 && (item.marketPrice === undefined || (typeof item.marketPrice === "string" && Number(item.marketPrice) >= 0)) && (item.quoteChangePercent === undefined || (typeof item.quoteChangePercent === "string" && Number.isFinite(Number(item.quoteChangePercent)))) && (item.quotePreviousClose === undefined || (typeof item.quotePreviousClose === "string" && Number.isFinite(Number(item.quotePreviousClose)))) && (item.quoteFetchedAt === undefined || typeof item.quoteFetchedAt === "string") && (item.quoteSource === undefined || typeof item.quoteSource === "string") && (item.quoteError === undefined || typeof item.quoteError === "string") && (item.realizedProfit === undefined || (typeof item.realizedProfit === "string" && Number.isFinite(Number(item.realizedProfit)))) && validOperations && typeof item.notes === "string";
}
