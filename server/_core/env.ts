export const ENV = {
  // VITE_APP_ID is public and required by the OAuth code exchange. The
  // fallback mirrors the client-side identifier for Vercel builds where the
  // platform variable was not configured.
  appId: process.env.VITE_APP_ID || "Sttsv86xmWRbQtbimz6ks6",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  googleOAuthRedirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  brapiToken: process.env.BRAPI_TOKEN ?? "",
};
