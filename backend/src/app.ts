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
import { studentRoutes } from "./routes/student.routes.js";

export const createApp = () => {
  const app = express();

  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true
    })
  );
  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());
  app.use(express.json());
  app.use(passport.initialize());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1", studentRoutes);
  app.use("/api/v1/admin", authenticate, requireRole("ADMIN"), adminRoutes);

  app.use((err: Error, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    void next;
    res.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: err.message
    });
  });

  return app;
};
