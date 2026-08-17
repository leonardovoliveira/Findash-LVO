import { createRemoteJWKSet, jwtVerify } from "jose";
import { parse as parseCookieHeader } from "cookie";
import { randomBytes, timingSafeEqual } from "crypto";
import type { Express, Request, Response } from "express";
import * as db from "../db.js";
import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const.js";
import { getSessionCookieOptions } from "./cookies.js";
import { ENV } from "./env.js";
import { sdk } from "./sdk.js";

const GOOGLE_AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const STATE_COOKIE = "__Host-google_oauth_state";
const LOCAL_STATE_COOKIE = "google_oauth_state";
const DEFAULT_REDIRECT_URI = "https://findash-lvo.vercel.app/api/auth/google/callback";

type GoogleTokenResponse = { id_token?: string; error?: string; error_description?: string };
type GoogleClaims = { sub?: string; email?: string; email_verified?: boolean; name?: string; picture?: string };

function usesSecureCookies(req: Request) {
  if (req.protocol === "https") return true;
  const forwarded = req.headers["x-forwarded-proto"];
  const values = Array.isArray(forwarded) ? forwarded : typeof forwarded === "string" ? forwarded.split(",") : [];
  return values.some(value => value.trim().toLowerCase() === "https");
}

function stateCookieName(req: Request) {
  return usesSecureCookies(req) ? STATE_COOKIE : LOCAL_STATE_COOKIE;
}

function hasValidGoogleConfiguration() {
  return Boolean(ENV.googleClientId && ENV.googleClientSecret);
}

export function googleRedirectUri() {
  return ENV.googleOAuthRedirectUri || DEFAULT_REDIRECT_URI;
}

export function googleOpenId(subject: string) {
  return `google:${subject}`;
}

export function buildGoogleAuthorizationUrl(state: string) {
  if (!hasValidGoogleConfiguration()) throw new Error("Google OAuth is not configured");
  const url = new URL(GOOGLE_AUTHORIZATION_ENDPOINT);
  url.searchParams.set("client_id", ENV.googleClientId);
  url.searchParams.set("redirect_uri", googleRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

function sameState(expected: string | undefined, received: string | undefined) {
  if (!expected || !received) return false;
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

function clearStateCookie(req: Request, res: Response) {
  res.clearCookie(stateCookieName(req), {
    path: "/",
    secure: usesSecureCookies(req),
    sameSite: usesSecureCookies(req) ? "none" : "lax",
  });
}

async function exchangeGoogleCode(code: string) {
  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: ENV.googleClientId,
      client_secret: ENV.googleClientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: googleRedirectUri(),
    }),
  });
  const payload = await response.json() as GoogleTokenResponse;
  if (!response.ok || !payload.id_token) throw new Error(payload.error_description || payload.error || "Google token exchange failed");
  return payload.id_token;
}

async function verifyGoogleIdentity(idToken: string) {
  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: ENV.googleClientId,
  });
  const claims = payload as GoogleClaims;
  if (!claims.sub || !claims.email || claims.email_verified !== true) throw new Error("Google account email is not verified");
  return claims;
}

export function registerGoogleOAuthRoutes(app: Express) {
  app.get("/api/auth/google", (req, res) => {
    if (!hasValidGoogleConfiguration()) {
      res.status(503).json({ error: "Google login is not configured" });
      return;
    }
    const state = randomBytes(32).toString("base64url");
    const secure = usesSecureCookies(req);
    res.cookie(stateCookieName(req), state, { httpOnly: true, path: "/", maxAge: 10 * 60 * 1000, secure, sameSite: secure ? "none" : "lax" });
    res.redirect(302, buildGoogleAuthorizationUrl(state));
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    const code = typeof req.query.code === "string" ? req.query.code : undefined;
    const state = typeof req.query.state === "string" ? req.query.state : undefined;
    const providerError = typeof req.query.error === "string" ? req.query.error : undefined;
    const expectedState = parseCookieHeader(req.headers.cookie ?? "")[stateCookieName(req)];
    clearStateCookie(req, res);
    if (providerError) {
      console.warn("[Google OAuth] Provider returned an error", providerError, req.query.error_description ?? "");
      res.redirect(302, "/?oauth_error=provider_denied");
      return;
    }
    if (!code || !sameState(expectedState, state)) {
      console.warn("[Google OAuth] Invalid state or missing authorization code");
      res.redirect(302, "/?oauth_error=invalid_state");
      return;
    }
    try {
      const idToken = await exchangeGoogleCode(code);
      const identity = await verifyGoogleIdentity(idToken);
      const openId = googleOpenId(identity.sub!);
      await db.upsertUser({ openId, name: identity.name ?? null, email: identity.email, avatarUrl: identity.picture ?? null, loginMethod: "google", lastSignedIn: new Date() });
      let sessionId: string | undefined;
      try {
        const candidate = sdk.createSessionId();
        const now = new Date();
        await db.createAuthSession({ sessionId: candidate, ownerOpenId: openId, deviceLabel: req.headers["user-agent"]?.includes("Mobile") ? "Dispositivo móvel" : "Navegador", userAgent: req.headers["user-agent"] ?? null, createdAt: now, lastSeenAt: now, expiresAt: new Date(now.getTime() + ONE_YEAR_MS) });
        sessionId = candidate;
      } catch (sessionError) {
        console.error("[Google OAuth] Session registry unavailable; continuing with a standard session", sessionError instanceof Error ? sessionError.message : sessionError);
      }
      const sessionToken = await sdk.createSessionToken(openId, { name: identity.name || identity.email, ...(sessionId ? { sessionId } : {}), expiresInMs: ONE_YEAR_MS });
      res.cookie(COOKIE_NAME, sessionToken, { ...getSessionCookieOptions(req), maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[Google OAuth] Callback failed", message);
      res.setHeader("Cache-Control", "no-store");
      res.redirect(302, "/?oauth_error=authentication_failed");
    }
  });
}
