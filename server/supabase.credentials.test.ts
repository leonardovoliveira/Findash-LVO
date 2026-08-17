import { describe, expect, it } from "vitest";

describe("Supabase credentials", () => {
  it("authenticates against the Supabase REST endpoint", async () => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return;
    expect(url).toMatch(/^https:\/\/[^/]+\.supabase\.co\/?$/);

    const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });

    expect(response.ok).toBe(true);
  });
});

export {};

// The credentials are read only from the server environment and are never exposed to the client bundle.
