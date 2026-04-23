import * as Sentry from "@sentry/node";
import type { Request } from "express";

import { env } from "../config/env.js";

let enabled = false;

export const initSentry = () => {
  const dsn = (env.SENTRY_DSN ?? "").trim();
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: env.SENTRY_ENVIRONMENT ?? env.NODE_ENV,
    release: env.SENTRY_RELEASE,
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE
  });

  enabled = true;
};

export const sentry = {
  isEnabled() {
    return enabled;
  },

  captureException(error: unknown, req?: Request) {
    if (!enabled) return;

    if (req) {
      Sentry.setContext("request", {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get("user-agent")
      });
    }

    Sentry.captureException(error);
  }
};

