import { describe, expect, it } from "vitest";

describe("BRAPI_TOKEN", () => {
  it("authorizes the B3SA3 quote endpoint without exposing the token", async () => {
    const token = process.env.BRAPI_TOKEN;
    expect(token, "BRAPI_TOKEN deve estar configurado").toBeTruthy();
    const response = await fetch("https://brapi.dev/api/v2/stocks/quote?symbols=B3SA3", {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    expect(response.ok, `brapi respondeu HTTP ${response.status}`).toBe(true);
    const payload = await response.json() as { results?: Array<{ data?: { regularMarketPrice?: number } }> };
    expect(payload.results?.[0]?.data).toBeDefined();
    expect(typeof payload.results?.[0]?.data?.regularMarketPrice).toBe("number");
  }, 15000);
});
