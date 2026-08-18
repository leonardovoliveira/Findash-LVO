import { z } from "zod";
import { COOKIE_NAME, ONE_YEAR_MS } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies.js";
import { systemRouter } from "./_core/systemRouter.js";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc.js";
import { TRPCError } from "@trpc/server";
import { createAuthSession, createTransaction, deleteTransaction, listAuthSessions, listTransactions, revokeAuthSession, revokeOtherAuthSessions, updateTransaction } from "./db.js";
import { ENV } from "./_core/env.js";
import { fetchBrapiStockHistory, fetchBrapiStockQuote } from "./brapi.js";
import { loadFinanceState, saveFinanceState, type FinanceStatePayload } from "./supabase.js";
import { sdk } from "./_core/sdk.js";

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

function firstFinite(...values: unknown[]) {
  for (const value of values) {
    const parsed = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function extractBrapiStockQuote(payload: unknown) {
  const root = payload as { results?: Array<{ data?: Record<string, unknown> } & Record<string, unknown>>; currency?: Array<Record<string, unknown>>; coins?: Array<Record<string, unknown>> };
  const result = root.results?.[0];
  const stock = (result?.data ?? result ?? {}) as Record<string, unknown>;
  const currency = root.currency?.[0] ?? {};
  const crypto = root.coins?.[0] ?? {};
  const price = firstFinite(stock.regularMarketPrice, stock.price, stock.close, currency.bid, crypto.regularMarketPrice, crypto.price);
  if (price === null) return null;
  const timestamp = stock.regularMarketTime ?? stock.updatedAt ?? currency.updatedAt ?? crypto.regularMarketTime;
  const parsedTime = timestamp ? new Date(String(timestamp)) : null;
  return {
    price,
    changePercent: firstFinite(stock.regularMarketChangePercent, stock.changePercent, currency.pctChange, crypto.regularMarketChangePercent),
    previousClose: firstFinite(stock.regularMarketPreviousClose, stock.previousClose, crypto.regularMarketPreviousClose),
    currency: String(stock.currency ?? currency.toCurrency ?? crypto.currency ?? "BRL"),
    fetchedAt: parsedTime && Number.isFinite(parsedTime.getTime()) ? parsedTime.toISOString() : undefined,
  };
}

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

export function treasurySymbolCandidates(ticker: string) {
  const raw = ticker.trim().toLowerCase();
  const normalized = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
  if (normalized.startsWith("tesouro-")) return [raw];
  const year = normalized.match(/20\d{2}/)?.[0];
  if (!year) return [raw];
  if (normalized.includes("renda")) return [`tesouro-renda-mais-1512${year}`, `tesouro-rend-a-1512${year}`, `tesouro-renda-mais-${year}`, raw];
  return [`tesouro-ipca-1505${year}`, `tesouro-ipca-${year}`, raw];
}

export async function fetchTreasuryQuote(ticker: string, fetchedAt: string, signal: AbortSignal, fetchImpl: typeof fetch = fetch, token?: string): Promise<MarketQuoteResult> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  let lastError = "Título sem preço indicativo disponível";
  try {
    for (const symbol of treasurySymbolCandidates(ticker)) {
      const response = await fetchImpl(`https://brapi.dev/api/v2/treasury/indicators?symbols=${encodeURIComponent(symbol)}`, { headers, signal });
      if (!response.ok) { lastError = `A fonte respondeu HTTP ${response.status}`; continue; }
      const payload = await response.json() as { results?: Array<{ symbol?: string; buyPrice?: number; sellPrice?: number; basePrice?: number; updatedAt?: string }> };
      const item = payload.results?.[0];
      const price = Number(item?.basePrice ?? item?.sellPrice ?? item?.buyPrice);
      if (!Number.isFinite(price)) continue;
      return { ok: true, ticker, price, changePercent: null, previousClose: null, currency: "BRL", source: `brapi.dev/tesouro (${item?.symbol ?? symbol})`, fetchedAt: item?.updatedAt ?? fetchedAt };
    }
    return { ok: false, ticker, source: "brapi.dev/tesouro", fetchedAt, error: lastError };
  } catch (error) {
    return { ok: false, ticker, source: "brapi.dev/tesouro", fetchedAt, error: error instanceof Error && error.name === "AbortError" ? "Tempo limite da cotação excedido" : "Não foi possível consultar a cotação do Tesouro Direto" };
  }
}

export type EconomicBenchmarks = { cdiAnnualRate: number; ipcaAnnualRate: number; cdiDate: string; ipcaDate: string; source: string; fetchedAt: string };

export async function fetchEconomicBenchmarks(fetchImpl: typeof fetch = fetch): Promise<EconomicBenchmarks> {
  const [cdiResponse, ipcaResponse] = await Promise.all([
    fetchImpl("https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados/ultimos/1?formato=json", { headers: { Accept: "application/json" } }),
    fetchImpl("https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados/ultimos/12?formato=json", { headers: { Accept: "application/json" } }),
  ]);
  if (!cdiResponse.ok || !ipcaResponse.ok) throw new Error(`Banco Central respondeu HTTP ${!cdiResponse.ok ? cdiResponse.status : ipcaResponse.status}`);
  const cdiRows = await cdiResponse.json() as Array<{ data?: string; valor?: string }>;
  const ipcaRows = await ipcaResponse.json() as Array<{ data?: string; valor?: string }>;
  const cdiDaily = Number(cdiRows.at(-1)?.valor);
  const ipcaMonthly = ipcaRows.map(row => Number(row.valor)).filter(Number.isFinite);
  if (!Number.isFinite(cdiDaily) || ipcaMonthly.length === 0) throw new Error("Indicadores CDI/IPCA sem valor disponível");
  const ipcaAnnualRate = (ipcaMonthly.reduce((acc, rate) => acc * (1 + rate / 100), 1) - 1) * 100;
  return { cdiAnnualRate: (Math.pow(1 + cdiDaily / 100, 252) - 1) * 100, ipcaAnnualRate, cdiDate: cdiRows.at(-1)?.data ?? "", ipcaDate: ipcaRows.at(-1)?.data ?? "", source: "Banco Central do Brasil (SGS)", fetchedAt: new Date().toISOString() };
}

export async function fetchTreasuryHistory(ticker: string, range: "1mo" | "6mo" | "1y", fetchImpl: typeof fetch = fetch, token?: string): Promise<Array<{ date: number; close: number }>> {
  const end = new Date();
  const start = new Date(end);
  start.setMonth(start.getMonth() - (range === "1mo" ? 1 : range === "6mo" ? 6 : 12));
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  for (const symbol of treasurySymbolCandidates(ticker)) {
    const params = new URLSearchParams({ symbols: symbol, startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) });
    const response = await fetchImpl(`https://brapi.dev/api/v2/treasury/indicators/history?${params.toString()}`, { headers });
    if (!response.ok) continue;
    const payload = await response.json() as { results?: Array<{ date?: string | number; basePrice?: number; sellPrice?: number; buyPrice?: number; close?: number }> };
    const result = (payload.results ?? []).map(point => ({ date: typeof point.date === "number" ? point.date : Date.parse(String(point.date ?? "")) / 1000, close: Number(point.close ?? point.basePrice ?? point.sellPrice ?? point.buyPrice) })).filter(point => Number.isFinite(point.date) && Number.isFinite(point.close));
    if (result.length) return result;
  }
  throw new Error("Nenhum histórico disponível para os símbolos do Tesouro Direto informado");
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
  sessions: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      let currentSessionId = ctx.sessionId;
      if (!currentSessionId) {
        currentSessionId = sdk.createSessionId();
        const now = new Date();
        await createAuthSession({ sessionId: currentSessionId, ownerOpenId: ctx.user.openId, deviceLabel: ctx.req.headers["user-agent"]?.includes("Mobile") ? "Dispositivo móvel" : "Navegador", userAgent: ctx.req.headers["user-agent"] ?? null, createdAt: now, lastSeenAt: now, expiresAt: new Date(now.getTime() + ONE_YEAR_MS) });
        const token = await sdk.createSessionToken(ctx.user.openId, { name: ctx.user.name || ctx.user.email || "Usuário", sessionId: currentSessionId, expiresInMs: ONE_YEAR_MS });
        (ctx.res as import("express").Response).cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: ONE_YEAR_MS });
      }
      return { currentSessionId, sessions: await listAuthSessions(ctx.user.openId) };
    }),
    revoke: protectedProcedure.input(z.object({ sessionId: z.string().min(1).max(128) })).mutation(async ({ ctx, input }) => {
      await revokeAuthSession(input.sessionId, ctx.user.openId);
      return { success: true } as const;
    }),
    revokeOthers: protectedProcedure.mutation(async ({ ctx }) => {
      if (!ctx.sessionId) throw new TRPCError({ code: "BAD_REQUEST", message: "A sessão atual não possui identificador revogável" });
      await revokeOtherAuthSessions(ctx.sessionId, ctx.user.openId);
      return { success: true } as const;
    }),
  }),
  financeState: router({
    load: protectedProcedure.query(async ({ ctx }) => {
      try {
        return await loadFinanceState(ctx.user.openId);
      } catch (error) {
        console.error("[FinanceState] load failed", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível carregar os dados financeiros na nuvem" });
      }
    }),
    save: protectedProcedure.input(z.object({ payload: z.unknown() })).mutation(async ({ ctx, input }) => {
      try {
        const payload = input.payload as FinanceStatePayload;
        if (!payload || payload.version !== 1 || !Array.isArray(payload.transactions) || !Array.isArray(payload.investments) || !Array.isArray(payload.creditCards) || !Array.isArray(payload.categories) || (payload.budgets !== undefined && !Array.isArray(payload.budgets))) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Estado financeiro inválido" });
        }
        return await saveFinanceState(ctx.user.openId, payload);
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[FinanceState] save failed", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível sincronizar os dados financeiros" });
      }
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
          const extracted = extractBrapiStockQuote(await response.json());
          if (!extracted) return { ok: false as const, ticker, source: "brapi.dev", fetchedAt, error: "Ticker sem cotação disponível" };
          return { ok: true as const, ticker, price: extracted.price, changePercent: extracted.changePercent, previousClose: extracted.previousClose, currency: extracted.currency, source: "brapi.dev", fetchedAt: extracted.fetchedAt ?? fetchedAt };
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
    benchmarks: protectedProcedure.query(() => fetchEconomicBenchmarks()),
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
