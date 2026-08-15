import { ENV } from "./_core/env.js";

const BRAPI_BASE_URL = "https://brapi.dev/api/v2";

export type BrapiStockQuoteData = {
  shortName?: string;
  longName?: string;
  currency?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketTime?: string;
  marketCap?: number;
  regularMarketVolume?: number;
  [key: string]: unknown;
};

type BrapiStockQuoteResponse = {
  results?: Array<{
    requestedSymbol?: string;
    symbol?: string;
    data?: BrapiStockQuoteData;
  }>;
};

export class BrapiHttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "BrapiHttpError";
  }
}

export type BrapiHistoricalPoint = { date: number; close: number; open?: number; high?: number; low?: number; volume?: number };

export async function fetchBrapiStockHistory(symbol: string, range: "1d" | "5d" | "1mo" | "3mo" | "6mo" | "1y" = "3mo", fetchImpl: typeof fetch = fetch): Promise<BrapiHistoricalPoint[]> {
  const normalizedSymbol = symbol.trim().toUpperCase();
  if (!/^[A-Z0-9._-]{1,24}$/.test(normalizedSymbol)) throw new Error("Símbolo de ação inválido");
  const headers: Record<string, string> = { Accept: "application/json" };
  if (ENV.brapiToken) headers.Authorization = `Bearer ${ENV.brapiToken}`;
  const response = await fetchImpl(`${BRAPI_BASE_URL}/stocks/historical?symbols=${encodeURIComponent(normalizedSymbol)}&range=${range}&interval=1d`, { headers });
  if (!response.ok) throw new BrapiHttpError(response.status, `A brapi respondeu HTTP ${response.status}`);
  const payload = await response.json() as { results?: Array<{ data?: { historicalDataPrice?: BrapiHistoricalPoint[] } }> };
  return payload.results?.[0]?.data?.historicalDataPrice ?? [];
}

export async function fetchBrapiStockQuote(symbol: string, fetchImpl: typeof fetch = fetch): Promise<BrapiStockQuoteData> {
  const normalizedSymbol = symbol.trim().toUpperCase();
  if (!/^[A-Z0-9._-]{1,24}$/.test(normalizedSymbol)) {
    throw new Error("Símbolo de ação inválido");
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  if (ENV.brapiToken) headers.Authorization = `Bearer ${ENV.brapiToken}`;
  const response = await fetchImpl(`${BRAPI_BASE_URL}/stocks/quote?symbols=${encodeURIComponent(normalizedSymbol)}`, { headers });
  if (!response.ok) {
    throw new BrapiHttpError(response.status, `A brapi respondeu HTTP ${response.status}`);
  }

  const payload = await response.json() as BrapiStockQuoteResponse;
  const data = payload.results?.[0]?.data;
  if (!data) throw new Error("A brapi não retornou dados para o símbolo informado");
  return data;
}
