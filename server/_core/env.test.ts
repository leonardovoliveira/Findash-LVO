import { afterEach, describe, expect, it, vi } from "vitest";

const originalAppId = process.env.VITE_APP_ID;

afterEach(() => {
  if (originalAppId === undefined) delete process.env.VITE_APP_ID;
  else process.env.VITE_APP_ID = originalAppId;
  vi.resetModules();
});

describe("OAuth application identifier", () => {
  it("uses the project public app id when VITE_APP_ID is absent", async () => {
    delete process.env.VITE_APP_ID;
    vi.resetModules();

    const { ENV } = await import("./env");

    expect(ENV.appId).toBe("Sttsv86xmWRbQtbimz6ks6");
  });
});
