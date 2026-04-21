import { monitorEventLoopDelay } from "node:perf_hooks";

type TelemetrySnapshot = {
  startedAt: string;
  uptimeSeconds: number;
  node: {
    version: string;
  };
  memory: {
    rssBytes: number;
    heapUsedBytes: number;
    heapTotalBytes: number;
    externalBytes: number;
  };
  eventLoopDelayMs: {
    mean: number;
    p95: number;
    max: number;
  };
  http: {
    total: number;
    inFlight: number;
    byStatusClass: Record<"2xx" | "3xx" | "4xx" | "5xx" | "other", number>;
    slowCountGte500ms: number;
  };
};

const statusClass = (status: number): keyof TelemetrySnapshot["http"]["byStatusClass"] => {
  if (status >= 200 && status < 300) return "2xx";
  if (status >= 300 && status < 400) return "3xx";
  if (status >= 400 && status < 500) return "4xx";
  if (status >= 500 && status < 600) return "5xx";
  return "other";
};

const startedAt = new Date();
const loop = monitorEventLoopDelay({ resolution: 20 });
loop.enable();

let inFlight = 0;
let total = 0;
let slowCountGte500ms = 0;
const byStatusClass: TelemetrySnapshot["http"]["byStatusClass"] = {
  "2xx": 0,
  "3xx": 0,
  "4xx": 0,
  "5xx": 0,
  other: 0
};

export const telemetryService = {
  onRequestStart() {
    inFlight += 1;
  },

  onRequestFinish(statusCode: number, elapsedMs: number) {
    inFlight = Math.max(0, inFlight - 1);
    total += 1;
    byStatusClass[statusClass(statusCode)] += 1;
    if (elapsedMs >= 500) slowCountGte500ms += 1;
  },

  snapshot(): TelemetrySnapshot {
    const memory = process.memoryUsage();
    return {
      startedAt: startedAt.toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      node: {
        version: process.version
      },
      memory: {
        rssBytes: memory.rss,
        heapUsedBytes: memory.heapUsed,
        heapTotalBytes: memory.heapTotal,
        externalBytes: memory.external
      },
      eventLoopDelayMs: {
        mean: Number((loop.mean / 1e6).toFixed(2)),
        p95: Number((loop.percentile(95) / 1e6).toFixed(2)),
        max: Number((loop.max / 1e6).toFixed(2))
      },
      http: {
        total,
        inFlight,
        byStatusClass: { ...byStatusClass },
        slowCountGte500ms
      }
    };
  }
};

