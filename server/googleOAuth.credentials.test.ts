import { describe, expect, it } from "vitest";

describe("Google OAuth credentials", () => {
  it("accepts the configured client credentials before the authorization-code exchange", async () => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    expect(clientId).toBeTruthy();
    expect(clientSecret).toBeTruthy();

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        code: "findash-credential-validation",
        grant_type: "authorization_code",
        redirect_uri: "https://findash-lvo.vercel.app/api/auth/google/callback",
      }),
    });
    const payload = await response.json() as { error?: string };

    // A deliberately invalid code must produce invalid_grant. Invalid client
    // credentials would instead be rejected as invalid_client / HTTP 401.
    expect(response.status).not.toBe(401);
    expect(payload.error).toBe("invalid_grant");
  }, 20_000);
});
