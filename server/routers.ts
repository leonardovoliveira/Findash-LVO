import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies.js";
import { systemRouter } from "./_core/systemRouter.js";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc.js";
import { createTransaction, deleteTransaction, listTransactions, updateTransaction } from "./db.js";
import { ENV } from "./_core/env.js";
import { fetchBrapiStockHistory, fetchBrapiStockQuote } from "./brapi.js";

const monthInput = z.object({
  month: z.number().int().min(1).max(12).optional(),
  year: z.number().int().min(2000).max(2200).optional(),
});

export function getRange(month?: number, year?: number) {
  if (!month || !year) return {};
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 1));
  return { from, to };
}

const quoteInput = z.object({
  ticker: z.string().trim().min(1).max(24).regex(/^[A-Za-z0-9._-]+$/),
  category: z.enum(["fixed-income", "equities", "funds", "treasury", "dollar", "crypto"]).default("equities"),
});

const stockQuoteInput = z.object({
  symbol: z.string().trim().min(1).max(24).regex(/^[A-Za-z0-9._-]+$/),
});

type MarketQuoteResult = { ok: true; ticker: string; price: number; changePercent: number | null; previousClose: number | null; currency: string; source: string; fetchedAt: string } | { ok: false; ticker: string; source: string; fetchedAt: string; error: string };

export async function fetchMarketFallback(category: "dollar" | "crypto", ticker: string, fetchedAt: string, signal: AbortSignal, fetchImpl: typeof fetch = fetch): Promise<MarketQuoteResult> {
  if (category === "dollar") {
    const pair = ticker === "EUR-BRL" ? "EUR-BRL" : "USD-BRL";
    const exchangeBase = pair === "EUR-BRL" ? "EUR" : "USD";
    try {
      const response = await fetchImpl(`https://open.er-api.com/v6/latest/${exchangeBase}`, { headers: { Accept: "application/json" }, signal });
      if (response.ok) {
        const payload = await response.json() as { result?: string; rates?: { BRL?: number }; time_last_update_unix?: number };
        const price = Number(payload.rates?.BRL);
        if (payload.result === "success" && Number.isFinite(price)) {
          const quoteTime = payload.time_last_update_unix ? new Date(payload.time_last_update_unix * 1000).toISOString() : fetchedAt;
          return { ok: true, ticker, price, changePercent: null, previousClose: null, currency: "BRL", source: "ExchangeRate-API", fetchedAt: quoteTime };
        }
      }
    } catch { /* tenta a fonte secundária abaixo */ }

    try {
      const response = await fetchImpl(`https://economia.awesomeapi.com.br/json/last/${pair}`, { headers: { Accept: "application/json" }, signal });
      if (!response.ok) return { ok: false, ticker, source: "AwesomeAPI", fetchedAt, error: `As fontes de câmbio responderam HTTP ${response.status}` };
      const payload = await response.json() as Record<string, { bid?: string; pctChange?: string; timestamp?: string }>;
      const quote = payload[pair.replace("-", "")];
      const price = Number(quote?.bid);
      const changePercent = Number(quote?.pctChange);
      if (!Number.isFinite(price)) return { ok: false, ticker, source: "AwesomeAPI", fetchedAt, error: "Câmbio sem cotação disponível" };
      const quoteTime = quote?.timestamp ? new Date(Number(quote.timestamp) * 1000).toISOString() : fetchedAt;
      const previousClose = Number.isFinite(changePercent) && changePercent !== -100 ? price / (1 + changePercent / 100) : null;
      return { ok: true, ticker, price, changePercent: Number.isFinite(changePercent) ? changePercent : null, previousClose, currency: "BRL", source: "AwesomeAPI", fetchedAt: quoteTime };
    } catch { return { ok: false, ticker, source: "ExchangeRate-API", fetchedAt, error: "Não foi possível consultar o câmbio" }; }
  }

  const coinId = ticker === "ETH-BRL" ? "ethereum" : "bitcoin";
  const response = await fetchImpl(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=brl&include_24hr_change=true`, { headers: { Accept: "application/json" }, signal });
  if (!response.ok) return { ok: false, ticker, source: "CoinGecko", fetchedAt, error: `A fonte de cripto respondeu HTTP ${response.status}` };
  const payload = await response.json() as Record<string, { brl?: number; brl_24h_change?: number }>;
  const price = Number(payload[coinId]?.brl);
  const changePercent = Number(payload[coinId]?.brl_24h_change);
  if (!Number.isFinite(price)) return { ok: false, ticker, source: "CoinGecko", fetchedAt, error: "Cripto sem cotação disponível" };
  const previousClose = Number.isFinite(changePercent) && changePercent !== -100 ? price / (1 + changePercent / 100) : null;
  return { ok: true, ticker, price, changePercent: Number.isFinite(changePercent) ? changePercent : null, previousClose, currency: "BRL", source: "CoinGecko", fetchedAt };
}

export async function fetchTreasuryQuote(ticker: string, fetchedAt: string, signal: AbortSignal, fetchImpl: typeof fetch = fetch, token?: string): Promise<MarketQuoteResult> {
  try {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetchImpl(`https://brapi.dev/api/v2/treasury/indicators?symbols=${encodeURIComponent(ticker.trim().toLowerCase())}`, { headers, signal });
    if (!response.ok) return { ok: false, ticker, source: "brapi.dev/tesouro", fetchedAt, error: `A fonte respondeu HTTP ${response.status}` };
    const payload = await response.json() as { results?: Array<{ symbol?: string; buyPrice?: number; sellPrice?: number; basePrice?: number; updatedAt?: string }> };
    const item = payload.results?.[0];
    const price = Number(item?.basePrice ?? item?.sellPrice ?? item?.buyPrice);
    if (!Number.isFinite(price)) return { ok: false, ticker, source: "brapi.dev/tesouro", fetchedAt, error: "Título sem preço indicativo disponível" };
    return { ok: true, ticker, price, changePercent: null, previousClose: null, currency: "BRL", source: "brapi.dev/tesouro", fetchedAt: item?.updatedAt ?? fetchedAt };
  } catch (error) {
    return { ok: false, ticker, source: "brapi.dev/tesouro", fetchedAt, error: error instanceof Error && error.name === "AbortError" ? "Tempo limite da cotação excedido" : "Não foi possível consultar a cotação do Tesouro Direto" };
  }
}

export async function fetchTreasuryHistory(ticker: string, range: "1mo" | "6mo" | "1y", fetchImpl: typeof fetch = fetch, token?: string): Promise<Array<{ date: number; close: number }>> {
  const end = new Date();
  const start = new Date(end);
  start.setMonth(start.getMonth() - (range === "1mo" ? 1 : range === "6mo" ? 6 : 12));
  const params = new URLSearchParams({ symbols: ticker.trim().toLowerCase(), startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) });
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetchImpl(`https://brapi.dev/api/v2/treasury/indicators/history?${params.toString()}`, { headers });
  if (!response.ok) throw new Error(`A fonte respondeu HTTP ${response.status}`);
  const payload = await response.json() as { results?: Array<{ date?: string | number; basePrice?: number; sellPrice?: number; buyPrice?: number; close?: number }> };
  return (payload.results ?? []).map(point => ({ date: typeof point.date === "number" ? point.date : Date.parse(String(point.date ?? "")) / 1000, close: Number(point.close ?? point.basePrice ?? point.sellPrice ?? point.buyPrice) })).filter(point => Number.isFinite(point.date) && Number.isFinite(point.close));
}

const transactionInput = z.object({
  type: z.enum(["income", "expense"]),
  description: z.string().trim().min(1).max(180),
  amount: z.number().positive().max(999999999),
  category: z.string().trim().min(1).max(80),
  occurredAt: z.coerce.date(),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      const response = ctx.res as import("express").Response;
      response.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  quotes: router({
    brapiBatch: protectedProcedure.input(z.object({ items: z.array(quoteInput).min(1).max(40) })).query(async ({ input }) => {
      const headers: Record<string, string> = { Accept: "application/json" };
      if (ENV.brapiToken) headers.Authorization = `Bearer ${ENV.brapiToken}`;
      return Promise.all(input.items.map(async item => {
        const ticker = item.ticker.trim().toUpperCase();
        const fetchedAt = new Date().toISOString();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        try {
          if (item.category === "dollar" || item.category === "crypto") return await fetchMarketFallback(item.category, ticker, fetchedAt, controller.signal);
          if (item.category === "treasury") return await fetchTreasuryQuote(ticker, fetchedAt, controller.signal, fetch, ENV.brapiToken);
          const url = `https://brapi.dev/api/v2/stocks/quote?symbols=${encodeURIComponent(ticker)}`;
          const response = await fetch(url, { headers, signal: controller.signal });
          if (!response.ok) return { ok: false as const, ticker, source: "brapi.dev", fetchedAt, error: `A fonte respondeu HTTP ${response.status}` };
          const payload = await response.json() as any;
          const stock = payload.results?.[0]?.data;
          const currency = payload.currency?.[0];
          const crypto = payload.coins?.[0];
          const price = stock?.regularMarketPrice ?? Number(currency?.bid) ?? crypto?.regularMarketPrice;
          const quoteTime = stock?.regularMarketTime ?? (currency?.updatedAt ? new Date(currency.updatedAt).toISOString() : crypto?.regularMarketTime) ?? fetchedAt;
          if (!Number.isFinite(price)) return { ok: false as const, ticker, source: "brapi.dev", fetchedAt: quoteTime, error: "Ticker sem cotação disponível" };
          return { ok: true as const, ticker, price, changePercent: stock?.regularMarketChangePercent ?? crypto?.regularMarketChange ?? null, previousClose: stock?.regularMarketPreviousClose ?? null, currency: stock?.currency ?? currency?.toCurrency ?? crypto?.currency ?? "BRL", source: "brapi.dev", fetchedAt: quoteTime };
        } catch (error) {
          return { ok: false as const, ticker, source: "brapi.dev", fetchedAt, error: error instanceof Error && error.name === "AbortError" ? "Tempo limite da cotação excedido" : "Não foi possível consultar a cotação" };
        } finally {
          clearTimeout(timeout);
        }
      }));
    }),
    brapi: protectedProcedure.input(stockQuoteInput).query(({ input }) => fetchBrapiStockQuote(input.symbol)),
    historical: protectedProcedure.input(stockQuoteInput.extend({ range: z.enum(["1d", "5d", "1mo", "3mo", "6mo", "1y"]).default("3mo") })).query(({ input }) => fetchBrapiStockHistory(input.symbol, input.range)),
    treasuryHistorical: protectedProcedure.input(stockQuoteInput.extend({ range: z.enum(["1mo", "6mo", "1y"]).default("1mo") })).query(({ input }) => fetchTreasuryHistory(input.symbol, input.range, fetch, ENV.brapiToken)),
  }),
  finance: router({
    list: protectedProcedure.input(monthInput).query(async ({ ctx, input }) => {
      const range = getRange(input.month, input.year);
      return listTransactions(ctx.user.id, range.from, range.to);
    }),
    create: protectedProcedure.input(transactionInput).mutation(({ ctx, input }) =>
      createTransaction({ ...input, userId: ctx.user.id, amount: input.amount.toFixed(2) })
    ),
    update: protectedProcedure.input(transactionInput.extend({ id: z.number().int().positive() })).mutation(({ ctx, input }) => {
      const { id, ...data } = input;
      return updateTransaction(id, ctx.user.id, { ...data, amount: data.amount.toFixed(2) });
    }),
    remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) =>
      deleteTransaction(input.id, ctx.user.id)
    ),
  }),
});

export type AppRouter = typeof appRouter;
