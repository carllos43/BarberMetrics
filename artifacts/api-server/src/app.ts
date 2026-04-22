import express from "express";
import helmet from "helmet";
import cors from "cors";
import { pinoHttp } from "pino-http";
import { logger } from "./lib/logger";
import { env, corsOrigins } from "./config/env";
import { globalRateLimit } from "./http/middlewares/rateLimit";
import { errorHandler } from "./http/middlewares/errorHandler";
import { notFound } from "./http/middlewares/notFound";
import apiRouter from "./http/routes";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(
    helmet({
      contentSecurityPolicy: false, // SPA frontend serves its own CSP via Replit
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );

  // CORS
  if (corsOrigins.length === 0) {
    // Dev mode: allow any origin (the Replit preview proxy already enforces auth at the edge).
    app.use(cors({ origin: true, credentials: true }));
  } else {
    app.use(
      cors({
        origin: (origin, cb) => {
          if (!origin) return cb(null, true);
          if (corsOrigins.includes(origin)) return cb(null, true);
          return cb(new Error(`Origin not allowed: ${origin}`));
        },
        credentials: true,
      }),
    );
  }

  app.use(express.json({ limit: "256kb" }));
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === "/api/healthz" } }));

  app.use(globalRateLimit);

  // Mount everything under /api so the path-routed preview proxy can reach it.
  app.use("/api", apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export { env };
