import express from "express";
import type { NextFunction, Request, Response } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "../server/_core/oauth.js";
import { registerGoogleOAuthRoutes } from "../server/_core/googleOAuth.js";
import { registerStorageProxy } from "../server/_core/storageProxy.js";
import { createContext } from "../server/_core/context.js";
import { appRouter } from "../server/routers.js";

const app = express();

app.use((req: Request, _res: Response, next: NextFunction) => {
  // Depending on the Vercel routing shape, /api may already be stripped
  // before the Express function receives the request. Normalize both forms.
  const request = req as Request & { url?: string };
  for (const prefix of ["/trpc", "/oauth", "/storage"]) {
    if (request.url?.startsWith(prefix)) {
      request.url = `/api${request.url}`;
      break;
    }
  }
  next();
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
registerStorageProxy(app);
registerOAuthRoutes(app);
registerGoogleOAuthRoutes(app);
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

export default app;
