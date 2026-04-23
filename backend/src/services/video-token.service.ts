import crypto from "node:crypto";

import type { User } from "@prisma/client";

import { redis } from "../config/redis.js";
import { enrollmentService } from "./enrollment.service.js";
import { lessonRepository } from "../repositories/lesson.repository.js";
import { refreshTokenRepository } from "../repositories/refresh-token.repository.js";
import { videoTokenRepository } from "../repositories/video-token.repository.js";
import { hashVideoToken, signPreviewToken, signVideoToken, verifyVideoToken } from "../utils/video-token.js";
import { verifyRefreshToken } from "../utils/jwt.js";

const TOKEN_TTL_SECONDS = 5 * 60;
const PREVIEW_TTL_SECONDS = 15 * 60;

const authSessionCacheKey = (userId: string, sessionId: string) => `session:${userId}:${sessionId}`;
const refreshCurrentCacheKey = (userId: string, sessionId: string) => `refresh-current:${userId}:${sessionId}`;
const previewSessionCacheKey = (previewSessionId: string) => `video-preview:${previewSessionId}`;
const videoTokenCacheKey = (tokenHash: string) => `video-token:${tokenHash}`;
const videoTokenContextKey = (tokenHash: string) => `video-token-ctx:${tokenHash}`;
const hashToken = (token: string): string => crypto.createHash("sha256").update(token).digest("hex");
const sha256 = (value: string): string => crypto.createHash("sha256").update(value).digest("hex");

const ipPrefix = (ip: string | undefined): string | null => {
  const value = (ip ?? "").trim();
  if (!value) return null;
  if (value.includes(".")) {
    const parts = value.split(".").filter(Boolean);
    return parts.length >= 3 ? `${parts[0]}.${parts[1]}.${parts[2]}` : value;
  }
  if (value.includes(":")) {
    const parts = value.split(":").filter(Boolean);
    return parts.length >= 4 ? parts.slice(0, 4).join(":") : value;
  }
  return value;
};

export class VideoTokenError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

export type VideoTokenValidationInput = {
  token: string | undefined;
  lessonId: string;
  rawRefreshToken?: string;
  previewSessionIdCookie?: string;
  ip?: string;
  userAgent?: string;
};

export const videoTokenService = {
  async issueToken(user: User, lessonId: string, sessionId: string, input?: { ip?: string; userAgent?: string }) {
    const lesson = await lessonRepository.findById(lessonId);
    if (!lesson?.isPublished) {
      throw new VideoTokenError("LESSON_NOT_FOUND", 404, "Lesson not found.");
    }

    await videoTokenRepository.revokeBySessionAndLesson(sessionId, lessonId);

    const rawToken = signVideoToken({
      userId: user.id,
      lessonId,
      sessionId
    });

    const expiresAt = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000);

    const tokenHash = hashVideoToken(rawToken);

    await videoTokenRepository.create({
      user: { connect: { id: user.id } },
      lesson: { connect: { id: lessonId } },
      tokenHash,
      sessionId,
      expiresAt
    });

    await redis.set(videoTokenCacheKey(tokenHash), "1", "EX", TOKEN_TTL_SECONDS + 30);

    const context = {
      ipPrefix: ipPrefix(input?.ip),
      uaHash: input?.userAgent ? sha256(input.userAgent) : null
    };
    await redis.set(videoTokenContextKey(tokenHash), JSON.stringify(context), "EX", TOKEN_TTL_SECONDS + 30);

    return {
      videoToken: rawToken,
      hlsUrl: `/api/v1/video/${lessonId}/playlist.m3u8?token=${encodeURIComponent(rawToken)}`,
      expiresAt
    };
  },

  async validateToken(input: VideoTokenValidationInput) {
    if (!input.token) {
      throw new VideoTokenError("INVALID_VIDEO_TOKEN", 401, "Missing video token.");
    }

    let payload: ReturnType<typeof verifyVideoToken>;
    try {
      payload = verifyVideoToken(input.token);
    } catch {
      throw new VideoTokenError("INVALID_VIDEO_TOKEN", 401, "Invalid video token.");
    }

    if (payload.lessonId !== input.lessonId) {
      throw new VideoTokenError("INVALID_VIDEO_TOKEN", 401, "Invalid video token.");
    }

    if ("isPreview" in payload && payload.isPreview) {
      const previewPayload = payload as { lessonId: string; previewSessionId: string; isPreview: true };
      const cookieValue = input.previewSessionIdCookie?.trim();
      if (!cookieValue || cookieValue !== previewPayload.previewSessionId) {
        throw new VideoTokenError("INVALID_VIDEO_TOKEN", 401, "Invalid video token.");
      }

      const raw = await redis.get(previewSessionCacheKey(previewPayload.previewSessionId));
      if (!raw) {
        throw new VideoTokenError("INVALID_VIDEO_TOKEN", 401, "Invalid video token.");
      }

      let session: { lessonId: string; ipPrefix: string | null; uaHash: string | null } | null = null;
      try {
        session = JSON.parse(raw) as { lessonId: string; ipPrefix: string | null; uaHash: string | null };
      } catch {
        session = null;
      }

      if (!session || session.lessonId !== previewPayload.lessonId) {
        throw new VideoTokenError("INVALID_VIDEO_TOKEN", 401, "Invalid video token.");
      }

      const currentIpPrefix = ipPrefix(input.ip);
      const currentUaHash = input.userAgent ? sha256(input.userAgent) : null;
      if (session.ipPrefix !== null && currentIpPrefix !== session.ipPrefix) {
        throw new VideoTokenError("INVALID_VIDEO_TOKEN", 401, "Invalid video token.");
      }
      if (session.uaHash !== null && currentUaHash !== session.uaHash) {
        throw new VideoTokenError("INVALID_VIDEO_TOKEN", 401, "Invalid video token.");
      }

      return payload;
    }

    const incomingHash = hashVideoToken(input.token);
    const cached = await redis.get(videoTokenCacheKey(incomingHash));
    if (!cached) {
      const stored = await videoTokenRepository.findByHash(incomingHash);
      if (!stored || stored.revokedAt || stored.expiresAt <= new Date()) {
        throw new VideoTokenError("INVALID_VIDEO_TOKEN", 401, "Invalid video token.");
      }

      const ttlSeconds = Math.max(5, Math.floor((stored.expiresAt.getTime() - Date.now()) / 1000));
      await redis.set(videoTokenCacheKey(incomingHash), "1", "EX", Math.min(ttlSeconds + 30, TOKEN_TTL_SECONDS + 30));
    }

    if (!input.rawRefreshToken) {
      throw new VideoTokenError("INVALID_VIDEO_TOKEN", 401, "Missing session.");
    }

    let refreshPayload: ReturnType<typeof verifyRefreshToken>;
    try {
      refreshPayload = verifyRefreshToken(input.rawRefreshToken);
    } catch {
      throw new VideoTokenError("INVALID_VIDEO_TOKEN", 401, "Invalid session.");
    }

    const fullPayload = payload as { userId: string; lessonId: string; sessionId: string };
    if (refreshPayload.userId !== fullPayload.userId || refreshPayload.sessionId !== fullPayload.sessionId) {
      throw new VideoTokenError("INVALID_VIDEO_TOKEN", 401, "Invalid session.");
    }

    const refreshHash = hashToken(input.rawRefreshToken);
    const currentHash = await redis.get(refreshCurrentCacheKey(fullPayload.userId, fullPayload.sessionId));
    if (currentHash) {
      if (currentHash !== refreshHash) {
        throw new VideoTokenError("INVALID_VIDEO_TOKEN", 401, "Invalid session.");
      }
    } else {
      const refreshToken = await refreshTokenRepository.findByHash(refreshHash);
      if (!refreshToken || refreshToken.revokedAt || refreshToken.expiresAt <= new Date()) {
        throw new VideoTokenError("INVALID_VIDEO_TOKEN", 401, "Invalid session.");
      }
    }

    const authSession = await redis.get(authSessionCacheKey(fullPayload.userId, fullPayload.sessionId));
    if (!authSession) {
      throw new VideoTokenError("INVALID_VIDEO_TOKEN", 401, "Inactive session.");
    }

    const contextRaw = await redis.get(videoTokenContextKey(incomingHash));
    if (contextRaw) {
      try {
        const context = JSON.parse(contextRaw) as { ipPrefix: string | null; uaHash: string | null };
        const currentIpPrefix = ipPrefix(input.ip);
        const currentUaHash = input.userAgent ? sha256(input.userAgent) : null;
        if (context.ipPrefix !== null && currentIpPrefix !== context.ipPrefix) {
          throw new VideoTokenError("INVALID_VIDEO_TOKEN", 401, "Invalid video token.");
        }
        if (context.uaHash !== null && currentUaHash !== context.uaHash) {
          throw new VideoTokenError("INVALID_VIDEO_TOKEN", 401, "Invalid video token.");
        }
      } catch (error) {
        if (error instanceof VideoTokenError) throw error;
      }
    }

    const enrollmentStatus = await enrollmentService.getStatus(fullPayload.userId);
    if (!enrollmentStatus.enrolled || enrollmentStatus.status !== "ACTIVE") {
      throw new VideoTokenError("INVALID_VIDEO_TOKEN", 401, "Invalid video token.");
    }

    return payload;
  },

  async issuePreviewToken(input: { lessonId: string; ip?: string; userAgent?: string }) {
    const previewSessionId = crypto.randomUUID();
    const previewToken = signPreviewToken({ lessonId: input.lessonId, previewSessionId, isPreview: true });
    const expiresAt = new Date(Date.now() + PREVIEW_TTL_SECONDS * 1000);

    const record = {
      lessonId: input.lessonId,
      ipPrefix: ipPrefix(input.ip),
      uaHash: input.userAgent ? sha256(input.userAgent) : null
    };
    await redis.set(previewSessionCacheKey(previewSessionId), JSON.stringify(record), "EX", PREVIEW_TTL_SECONDS);

    return {
      videoToken: previewToken,
      hlsUrl: `/api/v1/video/${input.lessonId}/playlist.m3u8?token=${encodeURIComponent(previewToken)}`,
      expiresAt,
      previewSessionId
    };
  },

  async revokeSession(_userId: string, sessionId: string) {
    await videoTokenRepository.revokeBySession(sessionId);
  },

  async revokeUser(userId: string) {
    await videoTokenRepository.revokeByUser(userId);
  }
};
