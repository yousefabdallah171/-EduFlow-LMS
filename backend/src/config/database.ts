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

if (process.env.NODE_ENV !== "production") {
  global.__prisma__ = prisma;
}
