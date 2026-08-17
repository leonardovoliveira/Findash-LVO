import { describe, expect, it, vi } from "vitest";
import { fetchMarketFallback, fetchTreasuryHistory, fetchTreasuryQuote, treasurySymbolCandidates } from "./routers";

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

  it("maps ExchangeRate-API EUR/BRL data", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ result: "success", rates: { BRL: 6.02 }, time_last_update_unix: "1786752151" }), { status: 200 }));
    const result = await fetchMarketFallback("dollar", "EUR-BRL", "2026-08-15T12:00:00.000Z", new AbortController().signal, fetchMock);
    expect(result).toMatchObject({ ok: true, ticker: "EUR-BRL", price: 6.02, currency: "BRL", source: "ExchangeRate-API" });
    expect(fetchMock).toHaveBeenCalledWith("https://open.er-api.com/v6/latest/EUR", expect.any(Object));
  });

  it("maps CoinGecko ETH/BRL data", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ ethereum: { brl: 18000, brl_24h_change: -1.2 } }), { status: 200 }));
    const result = await fetchMarketFallback("crypto", "ETH-BRL", "2026-08-15T12:00:00.000Z", new AbortController().signal, fetchMock);
    expect(result).toMatchObject({ ok: true, ticker: "ETH-BRL", price: 18000, changePercent: -1.2, currency: "BRL", source: "CoinGecko" });
    expect(fetchMock).toHaveBeenCalledWith("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=brl&include_24hr_change=true", expect.any(Object));
  });

  it("maps current Tesouro Direto indicators to a BRL quote", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ results: [{ symbol: "tesouro-selic-01032031", basePrice: 15432.1, buyPrice: 15420, sellPrice: 15410, updatedAt: "2026-08-17T12:00:00.000Z" }] }), { status: 200 }));
    const result = await fetchTreasuryQuote("TESOURO-SELIC-01032031", "2026-08-17T12:00:00.000Z", new AbortController().signal, fetchMock, "token-test");
    expect(result).toMatchObject({ ok: true, ticker: "TESOURO-SELIC-01032031", price: 15432.1, currency: "BRL", source: expect.stringContaining("brapi.dev/tesouro") });
    expect(fetchMock).toHaveBeenCalledWith("https://brapi.dev/api/v2/treasury/indicators?symbols=tesouro-selic-01032031", expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer token-test" }) }));
  });

  it("maps user-friendly RendA+ labels to public symbol candidates", () => {
    expect(treasurySymbolCandidates("RENDA+ 2065")).toContain("tesouro-renda-mais-15122065");
    expect(treasurySymbolCandidates("Tesouro IPCA+ 2035")).toContain("tesouro-ipca-15052035");
  });

  it("tries additional Tesouro symbols until a quote is found", async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ results: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ results: [{ symbol: "tesouro-rend-a-15122065", basePrice: 1200 }] }), { status: 200 }));
    const result = await fetchTreasuryQuote("RENDA+ 2065", "2026-08-17T12:00:00.000Z", new AbortController().signal, fetchMock);
    expect(result).toMatchObject({ ok: true, ticker: "RENDA+ 2065", price: 1200 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns a typed error when Tesouro Direto has no price", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ results: [{ symbol: "tesouro-selic-01032031" }] }), { status: 200 }));
    await expect(fetchTreasuryQuote("tesouro-selic-01032031", "2026-08-17T12:00:00.000Z", new AbortController().signal, fetchMock)).resolves.toMatchObject({ ok: false, source: "brapi.dev/tesouro", error: "Título sem preço indicativo disponível" });
  });

  it("maps Tesouro Direto historical prices to chart points", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ results: [{ date: "2026-07-17T00:00:00.000Z", basePrice: 100 }, { date: "2026-08-17T00:00:00.000Z", sellPrice: 104.5 }] }), { status: 200 }));
    const result = await fetchTreasuryHistory("TESOURO-SELIC-01032031", "1mo", fetchMock, "token-test");
    expect(result).toHaveLength(2);
    expect(result[0].close).toBe(100);
    expect(result[1].close).toBe(104.5);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/v2/treasury/indicators/history?"), expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer token-test" }) }));
  });

  it("returns a typed error when a fallback provider fails", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response("blocked", { status: 429 }));
    await expect(fetchMarketFallback("crypto", "BTC", "2026-08-15T12:00:00.000Z", new AbortController().signal, fetchMock)).resolves.toMatchObject({ ok: false, source: "CoinGecko", error: "A fonte de cripto respondeu HTTP 429" });
  });
});
