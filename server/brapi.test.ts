import { describe, expect, it, vi } from "vitest";
import { BrapiHttpError, fetchBrapiStockHistory, fetchBrapiStockQuote } from "./brapi";

describe("fetchBrapiStockHistory", () => {
  it("returns historicalDataPrice from results[0].data", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ results: [{ data: { historicalDataPrice: [{ date: 1, close: 12.5 }] } }] }), { status: 200 }));
    await expect(fetchBrapiStockHistory("B3SA3", "3mo", fetchMock)).resolves.toEqual([{ date: 1, close: 12.5 }]);
  });

  it("throws a typed error for non-2xx historical responses", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response("forbidden", { status: 403 }));
    await expect(fetchBrapiStockHistory("B3SA3", "3mo", fetchMock)).rejects.toMatchObject({ status: 403 });
  });
});

describe("fetchBrapiStockQuote", () => {
  it("returns results[0].data for the requested symbol", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      results: [{ requestedSymbol: "B3SA3", symbol: "B3SA3", data: { regularMarketPrice: 12.34, currency: "BRL" } }],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const data = await fetchBrapiStockQuote("b3sa3", fetchMock);

    expect(data).toEqual({ regularMarketPrice: 12.34, currency: "BRL" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://brapi.dev/api/v2/stocks/quote?symbols=B3SA3",
      expect.objectContaining({ headers: { Accept: "application/json", Authorization: expect.any(String) }}),
    );
  });

  it("throws a typed error for non-2xx responses", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response("forbidden", { status: 403 }));
    await expect(fetchBrapiStockQuote("B3SA3", fetchMock)).rejects.toEqual(expect.any(BrapiHttpError));
    await expect(fetchBrapiStockQuote("B3SA3", fetchMock)).rejects.toMatchObject({ status: 403 });
  });

  it("does not expose the token in the request URL", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ results: [{ data: {} }] }), { status: 200 }));
    await fetchBrapiStockQuote("B3SA3", fetchMock).catch(() => undefined);
    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain(process.env.BRAPI_TOKEN ?? "__missing_token__");
  });
});
