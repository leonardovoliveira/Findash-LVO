import { describe, expect, it } from "vitest";
import { buildDirectGoogleUser } from "./sdk";

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
