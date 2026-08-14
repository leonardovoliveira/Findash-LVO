import { afterEach, describe, expect, it } from "vitest";
import { createContext } from "./_core/context";

const originalNodeEnv = process.env.NODE_ENV;
const originalBypass = process.env.DEV_AUTH_BYPASS;

function restoreEnv() {
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
  if (originalBypass === undefined) delete process.env.DEV_AUTH_BYPASS;
  else process.env.DEV_AUTH_BYPASS = originalBypass;
}

afterEach(restoreEnv);

describe("development authentication bypass", () => {
  it("provides a temporary user outside production by default", async () => {
    process.env.NODE_ENV = "development";
    delete process.env.DEV_AUTH_BYPASS;

    const context = await createContext({
      req: {} as never,
      res: {} as never,
      info: {} as never,
    });

    expect(context.user?.loginMethod).toBe("development");
    expect(context.user?.email).toBe("dev@findash.local");
  });

  it("does not bypass authentication in production", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.DEV_AUTH_BYPASS;

    const context = await createContext({
      req: {} as never,
      res: {} as never,
      info: {} as never,
    });

    expect(context.user).toBeNull();
  });

  it("can be explicitly disabled during development", async () => {
    process.env.NODE_ENV = "development";
    process.env.DEV_AUTH_BYPASS = "false";

    const context = await createContext({
      req: {} as never,
      res: {} as never,
      info: {} as never,
    });

    expect(context.user).toBeNull();
  });
});
