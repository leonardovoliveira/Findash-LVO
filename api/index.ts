import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "../server/_core/oauth";
import { registerStorageProxy } from "../server/_core/storageProxy";
import { createContext } from "../server/_core/context";
import { appRouter } from "../server/routers";

const app = express();

app.use((req, _res, next) => {
  // Depending on the Vercel routing shape, /api may already be stripped
  // before the Express function receives the request. Normalize both forms.
  for (const prefix of ["/trpc", "/oauth", "/storage"]) {
    if (req.url?.startsWith(prefix)) {
      req.url = `/api${req.url}`;
      break;
    }
  }
  next();
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
registerStorageProxy(app);
registerOAuthRoutes(app);
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

export default app;
