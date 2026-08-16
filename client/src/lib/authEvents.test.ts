import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadAuthEvents, recordAuthEvent } from "./authEvents";

const values = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => values.set(key, value),
};

describe("auth event diagnostics", () => {
  beforeEach(() => {
    values.clear();
    vi.stubGlobal("window", { localStorage: localStorageMock });
  });

  it("stores structured login and logout events locally", () => {
    recordAuthEvent("login_started");
    recordAuthEvent("logout_failed", { message: "network" });
    const events = loadAuthEvents();
    expect(events).toHaveLength(2);
    expect(events[0].type).toBe("login_started");
    expect(events[1].details?.message).toBe("network");
    expect(events[0].timestamp).toEqual(expect.any(String));
  });
});
