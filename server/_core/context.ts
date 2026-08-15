import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema.js";
import { getUserByOpenId, upsertUser } from "../db.js";
import { sdk } from "./sdk.js";

const DEV_USER = {
  id: 1,
  openId: "findash-development-user",
  name: "Usuário de desenvolvimento",
  email: "dev@findash.local",
  avatarUrl: null,
  loginMethod: "development",
  role: "admin" as const,
  createdAt: new Date(0),
  updatedAt: new Date(0),
  lastSignedIn: new Date(),
};

async function getDevelopmentUser(): Promise<User | null> {
  // Keep the convenience user only for local development. Production must always
  // authenticate through the OAuth session cookie, regardless of missing env vars.
  const bypassEnabled = process.env.NODE_ENV !== "production" && process.env.DEV_AUTH_BYPASS !== "false";

  if (!bypassEnabled) {
    return null;
  }

  await upsertUser(DEV_USER);
  return (await getUserByOpenId(DEV_USER.openId)) ?? DEV_USER;
}

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  const developmentUser = await getDevelopmentUser();
  let user: User | null = developmentUser;

  if (user) {
    return {
      req: opts.req,
      res: opts.res,
      user,
    };
  }

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
