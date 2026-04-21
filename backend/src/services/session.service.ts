import { redis } from "../config/redis.js";
import { refreshTokenRepository } from "../repositories/refresh-token.repository.js";
import { videoTokenService } from "./video-token.service.js";

const activeSessionKey = (userId: string) => `active-session:${userId}`;
const sessionCacheKey = (userId: string, sessionId: string) => `session:${userId}:${sessionId}`;
const refreshCurrentCacheKey = (userId: string, sessionId: string) => `refresh-current:${userId}:${sessionId}`;

export const sessionService = {
  async setActiveSession(userId: string, sessionId: string, ttlSeconds: number): Promise<void> {
    const previousSessionId = await redis.get(activeSessionKey(userId));
    if (previousSessionId && previousSessionId !== sessionId) {
      await Promise.allSettled([
        redis.del(sessionCacheKey(userId, previousSessionId)),
        redis.del(refreshCurrentCacheKey(userId, previousSessionId)),
        refreshTokenRepository.revokeBySession(userId, previousSessionId),
        videoTokenService.revokeSession(userId, previousSessionId)
      ]);
    }

    await redis.set(activeSessionKey(userId), sessionId, "EX", ttlSeconds);
  },

  async invalidateIfActive(userId: string, sessionId: string): Promise<void> {
    const active = await redis.get(activeSessionKey(userId));
    if (active === sessionId) {
      await redis.del(activeSessionKey(userId));
    }
  },

  async isActiveSession(userId: string, sessionId: string): Promise<boolean> {
    const active = await redis.get(activeSessionKey(userId));
    return active === sessionId;
  },

  async ensureActiveSession(userId: string, sessionId: string, ttlSeconds: number): Promise<boolean> {
    const active = await redis.get(activeSessionKey(userId));
    if (active) {
      return active === sessionId;
    }

    const sessionMarker = await redis.get(sessionCacheKey(userId, sessionId));
    if (!sessionMarker) {
      return false;
    }

    await redis.set(activeSessionKey(userId), sessionId, "EX", ttlSeconds);
    return true;
  }
};

