import { createHash } from "node:crypto";
import { redis } from "../config/redis.js";

const CACHE_VERSION_PREFIX = "cache-version";

const getCacheVersionKey = (serviceKey: string) => `${CACHE_VERSION_PREFIX}:${serviceKey}`;

export const cacheVersioningService = {
  async getVersion(serviceKey: string): Promise<string> {
    try {
      const version = await redis.get(getCacheVersionKey(serviceKey));
      return version ?? "1";
    } catch {
      return "1";
    }
  },

  async bumpVersion(serviceKey: string): Promise<string> {
    try {
      const newVersion = await redis.incr(getCacheVersionKey(serviceKey));
      return String(newVersion);
    } catch {
      return "1";
    }
  },

  createVersionedKey(baseKey: string, version: string): string {
    const versionHash = createHash("sha256").update(version).digest("hex");
    return `${baseKey}:${versionHash}`;
  }
};
