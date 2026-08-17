import { describe, expect, it } from "vitest";
import { buildDirectGoogleUser, sdk } from "./sdk";

describe("direct Google session fallback", () => {
  it("builds an authenticated local user without the legacy OAuth server", () => {
    const now = new Date("2026-08-16T16:20:00.000Z");
    const user = buildDirectGoogleUser({ openId: "google:subject-123", name: "Leeo Viiegas" }, now);

    expect(user).toMatchObject({
      id: -1,
      openId: "google:subject-123",
      name: "Leeo Viiegas",
      loginMethod: "google",
      role: "user",
    });
    expect(user.createdAt).toBe(now);
    expect(user.lastSignedIn).toBe(now);
  });
});


describe("device session identity", () => {
  it("generates unique UUID session ids and preserves them in signed tokens", async () => {
    const first = sdk.createSessionId();
    const second = sdk.createSessionId();
    expect(first).not.toBe(second);
    expect(first).toMatch(/^[0-9a-f-]{36}$/);

    const token = await sdk.signSession({ openId: "google:subject-123", appId: "findash-lvo", name: "Leeo Viiegas", sessionId: first }, { expiresInMs: 60_000 });
    await expect(sdk.verifySession(token)).resolves.toMatchObject({ openId: "google:subject-123", sessionId: first });
  });
});
