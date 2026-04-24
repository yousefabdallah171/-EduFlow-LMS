import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

const buildDatasourceUrl = () => {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;

  const connectionLimitRaw = (process.env.DATABASE_CONNECTION_LIMIT ?? "").trim();
  const poolTimeoutRaw = (process.env.DATABASE_POOL_TIMEOUT_SECONDS ?? "").trim();

  if (!connectionLimitRaw && !poolTimeoutRaw) return url;

  try {
    const parsed = new URL(url);
    if (connectionLimitRaw && !parsed.searchParams.has("connection_limit")) {
      parsed.searchParams.set("connection_limit", connectionLimitRaw);
    }
    if (poolTimeoutRaw && !parsed.searchParams.has("pool_timeout")) {
      parsed.searchParams.set("pool_timeout", poolTimeoutRaw);
    }
    return parsed.toString();
  } catch {
    return url;
  }
};

export const prisma =
  global.__prisma__ ??
  new PrismaClient({
    datasources: {
      db: {
        url: buildDatasourceUrl()
      }
    },
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"]
  });

// Add middleware for metrics tracking
if (!global.__prisma__ || process.env.NODE_ENV !== "production") {
  prisma.$use(async (params, next) => {
    const startTime = Date.now();
    try {
      const result = await next(params);
      const durationMs = Date.now() - startTime;

      // Lazy load metricsService to avoid circular dependency
      try {
        const { metricsService } = await import("../services/metrics.service.js");
        const operation = (params.action || "unknown") as "select" | "create" | "update" | "delete";
        const table = params.model || "unknown";
        metricsService.recordDatabaseQuery(operation, table, durationMs);
      } catch {
        // ignore metrics failures
      }

      return result;
    } catch (error) {
      const durationMs = Date.now() - startTime;

      // Record error metrics
      try {
        const { metricsService } = await import("../services/metrics.service.js");
        const operation = (params.action || "unknown") as "select" | "create" | "update" | "delete";
        const table = params.model || "unknown";
        metricsService.recordDatabaseQuery(operation, table, durationMs, "DATABASE_ERROR");
      } catch {
        // ignore metrics failures
      }

      throw error;
    }
  });
}

if (process.env.NODE_ENV !== "production") {
  global.__prisma__ = prisma;
}
