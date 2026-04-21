import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import passport from "passport";

import { env } from "./config/env.js";
import "./config/passport.js";
import { authenticate } from "./middleware/auth.middleware.js";
import { requireRole } from "./middleware/rbac.middleware.js";
import { adminRoutes } from "./routes/admin.routes.js";
import { authRoutes } from "./routes/auth.routes.js";
import { publicRoutes } from "./routes/public.routes.js";
import { studentRoutes } from "./routes/student.routes.js";
import { prometheus } from "./observability/prometheus.js";
import { sentry } from "./observability/sentry.js";
import { telemetryService } from "./services/telemetry.service.js";

export const createApp = () => {
  const app = express();

  app.set("trust proxy", 1);

  const redactUrl = (value: string) =>
    value.replace(/([?&]token=)[^&]+/g, "$1<redacted>");

  app.use((req, res, next) => {
    telemetryService.onRequestStart();
    const start = process.hrtime.bigint();
    res.on("finish", () => {
      const elapsedMs = Number(process.hrtime.bigint() - start) / 1_000_000;
      telemetryService.onRequestFinish(res.statusCode, elapsedMs);
    });
    next();
  });

  app.use(prometheus.middleware);

  if (env.NODE_ENV !== "production") {
    app.use((req, res, next) => {
      const start = process.hrtime.bigint();
      res.on("finish", () => {
        const elapsedMs = Number(process.hrtime.bigint() - start) / 1_000_000;
        if (elapsedMs >= 500) {
          // eslint-disable-next-line no-console
          console.warn(
            `[slow] ${req.method} ${redactUrl(req.originalUrl)} ${res.statusCode} ${Math.round(elapsedMs)}ms`
          );
        }
      });
      next();
    });
  }

  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true
    })
  );
  app.use(helmet());
  app.use(
    compression({
      filter: (req, res) => {
        if (req.path.startsWith("/api/v1/video/")) {
          return false;
        }

        return compression.filter(req, res);
      }
    })
  );
  app.use(cookieParser());
  app.use(express.json());
  app.use(passport.initialize());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/health/metrics", (_req, res) => {
    res.json(telemetryService.snapshot());
  });

  app.get("/metrics", (req, res) => {
    void prometheus.handler(req, res);
  });

  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1", publicRoutes);
  app.use("/api/v1", studentRoutes);
  app.use("/api/v1/admin", authenticate, requireRole("ADMIN"), adminRoutes);

  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    void next;
    sentry.captureException(err, req);
    res.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: err.message
    });
  });

  return app;
};
