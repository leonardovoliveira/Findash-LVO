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
    const response = await fetchImpl("https://economia.awesomeapi.com.br/json/last/USD-BRL", { headers: { Accept: "application/json" }, signal });
    if (!response.ok) return { ok: false, ticker, source: "AwesomeAPI", fetchedAt, error: `A fonte de câmbio respondeu HTTP ${response.status}` };
    const payload = await response.json() as { USDBRL?: { bid?: string; pctChange?: string; timestamp?: string } };
    const quote = payload.USDBRL;
    const price = Number(quote?.bid);
    const changePercent = Number(quote?.pctChange);
    if (!Number.isFinite(price)) return { ok: false, ticker, source: "AwesomeAPI", fetchedAt, error: "Câmbio sem cotação disponível" };
    const quoteTime = quote?.timestamp ? new Date(Number(quote.timestamp) * 1000).toISOString() : fetchedAt;
    const previousClose = Number.isFinite(changePercent) && changePercent !== -100 ? price / (1 + changePercent / 100) : null;
    return { ok: true, ticker, price, changePercent: Number.isFinite(changePercent) ? changePercent : null, previousClose, currency: "BRL", source: "AwesomeAPI", fetchedAt: quoteTime };
  }

  const response = await fetchImpl("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=brl&include_24hr_change=true", { headers: { Accept: "application/json" }, signal });
  if (!response.ok) return { ok: false, ticker, source: "CoinGecko", fetchedAt, error: `A fonte de cripto respondeu HTTP ${response.status}` };
  const payload = await response.json() as { bitcoin?: { brl?: number; brl_24h_change?: number } };
  const price = Number(payload.bitcoin?.brl);
  const changePercent = Number(payload.bitcoin?.brl_24h_change);
  if (!Number.isFinite(price)) return { ok: false, ticker, source: "CoinGecko", fetchedAt, error: "Cripto sem cotação disponível" };
  const previousClose = Number.isFinite(changePercent) && changePercent !== -100 ? price / (1 + changePercent / 100) : null;
  return { ok: true, ticker, price, changePercent: Number.isFinite(changePercent) ? changePercent : null, previousClose, currency: "BRL", source: "CoinGecko", fetchedAt };
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
