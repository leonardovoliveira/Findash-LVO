import { describe, expect, it } from "vitest";
import { fetchEconomicBenchmarks } from "./routers";

describe("economic benchmarks", () => {
  it("annualizes CDI daily rate and compounds the latest IPCA months", async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      const body = url.includes(".12/")
        ? [{ data: "14/08/2026", valor: "0.05" }]
        : [{ data: "01/06/2026", valor: "0.20" }, { data: "01/07/2026", valor: "0.30" }];
      return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
    };
    const result = await fetchEconomicBenchmarks(fetchImpl);
    expect(result.cdiAnnualRate).toBeCloseTo((Math.pow(1.0005, 252) - 1) * 100, 8);
    expect(result.ipcaAnnualRate).toBeCloseTo(((1.002 * 1.003) - 1) * 100, 8);
    expect(result.source).toContain("Banco Central");
  });

  it("rejects non-2xx benchmark responses", async () => {
    const fetchImpl: typeof fetch = async () => new Response("indisponível", { status: 503 });
    await expect(fetchEconomicBenchmarks(fetchImpl)).rejects.toThrow("HTTP 503");
  });
});
