import { Router } from "express";
import { register } from "prom-client";

const router = Router();

/**
 * GET /metrics
 * Returns Prometheus metrics in text format
 * Used by Prometheus scraper
 */
router.get("/metrics", async (_req, res) => {
  try {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    res.status(500).end(error instanceof Error ? error.message : "Failed to generate metrics");
  }
});

/**
 * GET /metrics/health
 * Health check for metrics system
 */
router.get("/metrics/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export { router as metricsRoutes };
