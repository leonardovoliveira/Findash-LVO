import { afterEach, describe, expect, it, vi } from "vitest";
import { createSupabaseAuthSession, listSupabaseAuthSessions, loadFinanceState, revokeOtherSupabaseAuthSessions, revokeSupabaseAuthSession, saveFinanceState } from "./supabase";

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


describe("device sessions Supabase adapter", () => {
  afterEach(() => vi.restoreAllMocks());

  it("registra e lista uma sessão ativa do owner", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("", { status: 201 })).mockResolvedValueOnce(new Response(JSON.stringify([{ session_id: "sess-1", owner_key: "google-owner-1", device_label: "Navegador", user_agent: "Chrome", created_at: "2026-08-17T00:00:00.000Z", last_seen_at: "2026-08-17T01:00:00.000Z", expires_at: "2027-08-17T00:00:00.000Z", revoked_at: null }]), { status: 200 }));
    const now = new Date("2026-08-17T00:00:00.000Z");
    await createSupabaseAuthSession({ sessionId: "sess-1", ownerOpenId: "google-owner-1", deviceLabel: "Navegador", userAgent: "Chrome", createdAt: now, lastSeenAt: now, expiresAt: new Date("2027-08-17T00:00:00.000Z") });
    const sessions = await listSupabaseAuthSessions("google-owner-1");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sessions[0]).toMatchObject({ sessionId: "sess-1", ownerOpenId: "google-owner-1", deviceLabel: "Navegador" });
  });

  it("revoga uma sessão ou todas as outras com PATCH seguro", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 200 }));
    await revokeSupabaseAuthSession("sess-1", "google-owner-1");
    await revokeOtherSupabaseAuthSessions("sess-1", "google-owner-1");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "PATCH" });
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("session_id=neq.sess-1");
  });
});
