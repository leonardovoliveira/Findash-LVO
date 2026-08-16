import { describe, expect, it } from "vitest";
import { getSessionCookieOptions } from "./cookies";

function request(protocol: string, headers: Record<string, string> = {}) {
  return { protocol, headers } as never;
}

describe("session cookie options", () => {
  it("uses lax and insecure cookies for local HTTP", () => {
    expect(getSessionCookieOptions(request("http"))).toMatchObject({
      sameSite: "lax",
      secure: false,
      httpOnly: true,
      path: "/",
    });
  });

  it("uses none and secure cookies behind HTTPS proxy", () => {
    expect(getSessionCookieOptions(request("http", { "x-forwarded-proto": "https" }))).toMatchObject({
      sameSite: "none",
      secure: true,
    });
  });
});

export {};
