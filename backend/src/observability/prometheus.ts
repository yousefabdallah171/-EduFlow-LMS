import type { Request, Response } from "express";
import client from "prom-client";

import { env } from "../config/env.js";

const enabled = env.PROMETHEUS_METRICS_ENABLED;

const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

const httpDurationMs = new client.Histogram({
  name: "http_request_duration_ms",
  help: "HTTP request duration in milliseconds",
  labelNames: ["method", "route", "status"] as const,
  buckets: [25, 50, 100, 200, 300, 500, 800, 1200, 2000, 5000]
});

const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "HTTP requests total",
  labelNames: ["method", "route", "status"] as const
});

const httpInflight = new client.Gauge({
  name: "http_inflight_requests",
  help: "In-flight HTTP requests"
});

const videoSecurityEventsTotal = new client.Counter({
  name: "video_security_events_total",
  help: "Persisted VideoSecurityEvent anomalies",
  labelNames: ["eventType", "severity"] as const
});

const redisCacheHitsTotal = new client.Counter({
  name: "redis_cache_hits_total",
  help: "Redis cache hits",
  labelNames: ["cache"] as const
});

const redisCacheMissesTotal = new client.Counter({
  name: "redis_cache_misses_total",
  help: "Redis cache misses",
  labelNames: ["cache"] as const
});

const uploadRetryEventsTotal = new client.Counter({
  name: "upload_retry_events_total",
  help: "Upload retry events",
  labelNames: ["outcome"] as const
});

const uploadResumeEventsTotal = new client.Counter({
  name: "upload_resume_events_total",
  help: "Upload resume events",
  labelNames: ["result"] as const
});

const uploadThroughputBytes = new client.Counter({
  name: "upload_throughput_bytes_total",
  help: "Total acknowledged uploaded bytes"
});

registry.registerMetric(httpDurationMs);
registry.registerMetric(httpRequestsTotal);
registry.registerMetric(httpInflight);
registry.registerMetric(videoSecurityEventsTotal);
registry.registerMetric(redisCacheHitsTotal);
registry.registerMetric(redisCacheMissesTotal);
registry.registerMetric(uploadRetryEventsTotal);
registry.registerMetric(uploadResumeEventsTotal);
registry.registerMetric(uploadThroughputBytes);

const normalizeRoute = (req: Request): string => {
  const original = req.originalUrl.split("?")[0] ?? "/";

  return original
    .replace(/\/api\/v1\/video\/[^/]+/g, "/api/v1/video/:id")
    .replace(/\/api\/v1\/lessons\/[^/]+/g, "/api/v1/lessons/:id")
    .replace(/\/api\/v1\/student\/notes\/[^/]+/g, "/api/v1/student/notes/:id");
};

const shouldAllowMetrics = (req: Request): boolean => {
  const token = (env.PROMETHEUS_METRICS_TOKEN ?? "").trim();
  if (!token) return env.NODE_ENV !== "production";

  const header = (req.get("authorization") ?? "").trim();
  return header === `Bearer ${token}`;
};

export const prometheus = {
  enabled,

  middleware(req: Request, res: Response, next: (err?: unknown) => void) {
    if (!enabled) return next();
    if (req.path === "/metrics") return next();

    httpInflight.inc();
    const start = process.hrtime.bigint();

    res.on("finish", () => {
      httpInflight.dec();
      const elapsedMs = Number(process.hrtime.bigint() - start) / 1_000_000;
      const route = normalizeRoute(req);
      const status = String(res.statusCode);

      httpRequestsTotal.inc({ method: req.method, route, status });
      httpDurationMs.observe({ method: req.method, route, status }, elapsedMs);
    });

    next();
  },

  async handler(req: Request, res: Response) {
    if (!enabled) {
      res.status(404).json({ error: "NOT_FOUND" });
      return;
    }

    if (!shouldAllowMetrics(req)) {
      res.status(401).json({ error: "UNAUTHORIZED" });
      return;
    }

    res.setHeader("content-type", registry.contentType);
    res.send(await registry.metrics());
  },

  recordVideoSecurityEvent(eventType: string, severity: string) {
    if (!enabled) return;
    try {
      videoSecurityEventsTotal.inc({ eventType, severity });
    } catch {
      // ignore metrics failures
    }
  },

  recordCacheHit(cache: string) {
    if (!enabled) return;
    try {
      redisCacheHitsTotal.inc({ cache });
    } catch {
      // ignore metrics failures
    }
  },

  recordCacheMiss(cache: string) {
    if (!enabled) return;
    try {
      redisCacheMissesTotal.inc({ cache });
    } catch {
      // ignore metrics failures
    }
  },

  recordUploadRetry(outcome: "scheduled" | "maxed" | "failed") {
    if (!enabled) return;
    try {
      uploadRetryEventsTotal.inc({ outcome });
    } catch {
      // ignore metrics failures
    }
  },

  recordUploadResume(result: "success" | "failed") {
    if (!enabled) return;
    try {
      uploadResumeEventsTotal.inc({ result });
    } catch {
      // ignore metrics failures
    }
  },

  recordUploadThroughput(bytes: number) {
    if (!enabled) return;
    if (!Number.isFinite(bytes) || bytes <= 0) return;
    try {
      uploadThroughputBytes.inc(bytes);
    } catch {
      // ignore metrics failures
    }
  }
};

