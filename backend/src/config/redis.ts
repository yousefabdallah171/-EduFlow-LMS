import { Redis as IORedis } from "ioredis";

import { env } from "./env.js";

type RedisClient = InstanceType<typeof IORedis>;

declare global {
  // eslint-disable-next-line no-var
  var __redis__: RedisClient | undefined;
}

export const redis =
  global.__redis__ ??
  new IORedis(env.REDIS_URL, {
    keyPrefix: env.REDIS_KEY_PREFIX || undefined,
    maxRetriesPerRequest: 3,
    lazyConnect: process.env.NODE_ENV === "test"
  });

if (process.env.NODE_ENV !== "production") {
  global.__redis__ = redis;
}
