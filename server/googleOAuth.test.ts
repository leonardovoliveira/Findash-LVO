import { describe, expect, it } from "vitest";
import { buildGoogleAuthorizationUrl, googleRedirectUri } from "./_core/googleOAuth";

describe("direct Google OAuth", () => {
  it("builds a first-party Google authorization URL with a state value", () => {
    const url = new URL(buildGoogleAuthorizationUrl("csrf-state"));

    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.pathname).toBe("/o/oauth2/v2/auth");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("redirect_uri")).toBe("https://findash-lvo.vercel.app/api/auth/google/callback");
    expect(url.searchParams.get("scope")).toBe("openid email profile");
    expect(url.searchParams.get("state")).toBe("csrf-state");
    expect(url.searchParams.get("client_secret")).toBeNull();
  });

  it("uses the configured production callback URI", () => {
    expect(googleRedirectUri()).toBe("https://findash-lvo.vercel.app/api/auth/google/callback");
  });
});
