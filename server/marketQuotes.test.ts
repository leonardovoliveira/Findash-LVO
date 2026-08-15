import { describe, expect, it, vi } from "vitest";
import { fetchMarketFallback } from "./routers";

describe("market quote fallbacks", () => {
  it("maps ExchangeRate-API USD/BRL data", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ result: "success", rates: { BRL: 5.184431 }, time_last_update_unix: "1786752151" }), { status: 200 }));
    const result = await fetchMarketFallback("dollar", "USD-BRL", "2026-08-15T12:00:00.000Z", new AbortController().signal, fetchMock);
    expect(result).toMatchObject({ ok: true, ticker: "USD-BRL", price: 5.184431, changePercent: null, currency: "BRL", source: "ExchangeRate-API" });
    expect(fetchMock).toHaveBeenCalledWith("https://open.er-api.com/v6/latest/USD", expect.any(Object));
  });

  it("falls back to AwesomeAPI when ExchangeRate-API is unavailable", async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("unavailable", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ USDBRL: { bid: "5.22", pctChange: "2", timestamp: "1786733767" } }), { status: 200 }));
    const result = await fetchMarketFallback("dollar", "USD-BRL", "2026-08-15T12:00:00.000Z", new AbortController().signal, fetchMock);
    expect(result).toMatchObject({ ok: true, ticker: "USD-BRL", price: 5.22, changePercent: 2, currency: "BRL", source: "AwesomeAPI" });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "https://economia.awesomeapi.com.br/json/last/USD-BRL", expect.any(Object));
  });

  it("maps CoinGecko BTC/BRL data", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ bitcoin: { brl: 328935, brl_24h_change: 1.5 } }), { status: 200 }));
    const result = await fetchMarketFallback("crypto", "BTC", "2026-08-15T12:00:00.000Z", new AbortController().signal, fetchMock);
    expect(result).toMatchObject({ ok: true, ticker: "BTC", price: 328935, changePercent: 1.5, currency: "BRL", source: "CoinGecko" });
  });

  it("returns a typed error when a fallback provider fails", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response("blocked", { status: 429 }));
    await expect(fetchMarketFallback("crypto", "BTC", "2026-08-15T12:00:00.000Z", new AbortController().signal, fetchMock)).resolves.toMatchObject({ ok: false, source: "CoinGecko", error: "A fonte de cripto respondeu HTTP 429" });
  });
});
