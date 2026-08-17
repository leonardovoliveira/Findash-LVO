import { afterEach, describe, expect, it, vi } from "vitest";
import { loadFinanceState, saveFinanceState } from "./supabase";

describe("finance state Supabase adapter", () => {
  afterEach(() => vi.restoreAllMocks());

  it("carrega somente o payload do owner informado", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify([
      { payload: { version: 1, transactions: [], investments: [], creditCards: [], categories: [] }, updated_at: "2026-08-17T00:00:00.000Z" },
    ]), { status: 200, headers: { "Content-Type": "application/json" } }));

    const result = await loadFinanceState("google-owner-1");

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("owner_key=eq.google-owner-1");
    expect(result.payload?.version).toBe(1);
    expect(result.updatedAt).toBe("2026-08-17T00:00:00.000Z");
  });

  it("faz upsert do estado e rejeita resposta HTTP de erro", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("{}", { status: 201 }));
    const payload = { version: 1 as const, transactions: [], investments: [], creditCards: [], categories: [] };

    const result = await saveFinanceState("google-owner-2", payload);

    expect(result.updatedAt).toMatch(/Z$/);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "POST" });
    expect(String(fetchMock.mock.calls[0]?.[1]?.body)).toContain("google-owner-2");

    fetchMock.mockResolvedValueOnce(new Response("failure", { status: 503 }));
    await expect(loadFinanceState("google-owner-2")).rejects.toThrow("HTTP 503");
  });
});
