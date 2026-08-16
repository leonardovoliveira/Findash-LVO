import { describe, expect, it } from "vitest";
import { googleLoginUrl } from "./const";

describe("Google login URL", () => {
  it("uses the application direct endpoint and strips a trailing slash", () => {
    expect(googleLoginUrl("https://findash-lvo.vercel.app/")).toBe("https://findash-lvo.vercel.app/api/auth/google");
    expect(googleLoginUrl("https://findash-lvo.vercel.app")).toBe("https://findash-lvo.vercel.app/api/auth/google");
    expect(googleLoginUrl("https://findash-lvo.vercel.app")).not.toContain("appId");
  });
});
