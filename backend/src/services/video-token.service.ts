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

const sessionKeyCacheKey = (sessionId: string, lessonId: string) => `video-key:${sessionId}:${lessonId}`;
const authSessionCacheKey = (userId: string, sessionId: string) => `session:${userId}:${sessionId}`;
const hashToken = (token: string): string => crypto.createHash("sha256").update(token).digest("hex");

export class VideoTokenError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

export const videoTokenService = {
  async issueToken(user: User, lessonId: string, sessionId: string) {
    const lesson = await lessonRepository.findById(lessonId);
    if (!lesson?.isPublished) {
      throw new VideoTokenError("LESSON_NOT_FOUND", 404, "Lesson not found.");
    }

    // Revoke any existing tokens for this session+lesson to prevent orphan accumulation.
    await videoTokenRepository.revokeBySessionAndLesson(sessionId, lessonId);

    const rawToken = signVideoToken({
      userId: user.id,
      lessonId,
      sessionId
    });

    const expiresAt = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000);

    await videoTokenRepository.create({
      user: { connect: { id: user.id } },
      lesson: { connect: { id: lessonId } },
      tokenHash: hashVideoToken(rawToken),
      sessionId,
      expiresAt
    });

    await videoTokenService.getSessionKey(sessionId, lessonId);

    return {
      videoToken: rawToken,
      hlsUrl: `/api/v1/video/${lessonId}/playlist.m3u8?token=${encodeURIComponent(rawToken)}`,
      expiresAt
    };
  },

  async validateToken(token: string | undefined, lessonId: string, rawRefreshToken?: string) {
    if (!token) {
      throw new VideoTokenError("INVALID_VIDEO_TOKEN", 401, "Missing video token.");
    }

    let payload: ReturnType<typeof verifyVideoToken>;
    try {
      payload = verifyVideoToken(token);
    } catch {
      throw new VideoTokenError("INVALID_VIDEO_TOKEN", 401, "Invalid video token.");
    }

    if (payload.lessonId !== lessonId) {
      throw new VideoTokenError("INVALID_VIDEO_TOKEN", 401, "Invalid video token.");
    }

    // Preview tokens are stateless — skip DB and session checks.
    if ("isPreview" in payload && payload.isPreview) {
      return payload;
    }

    const stored = await videoTokenRepository.findByHash(hashVideoToken(token));
    if (!stored || stored.revokedAt || stored.expiresAt <= new Date()) {
      throw new VideoTokenError("INVALID_VIDEO_TOKEN", 401, "Invalid video token.");
    }

    if (!rawRefreshToken) {
      throw new VideoTokenError("INVALID_VIDEO_TOKEN", 401, "Missing session.");
    }

    let refreshPayload: ReturnType<typeof verifyRefreshToken>;
    try {
      refreshPayload = verifyRefreshToken(rawRefreshToken);
    } catch {
      throw new VideoTokenError("INVALID_VIDEO_TOKEN", 401, "Invalid session.");
    }

    const fullPayload = payload as { userId: string; lessonId: string; sessionId: string };
    if (refreshPayload.userId !== fullPayload.userId || refreshPayload.sessionId !== fullPayload.sessionId) {
      throw new VideoTokenError("INVALID_VIDEO_TOKEN", 401, "Invalid session.");
    }

    const authSession = await redis.get(authSessionCacheKey(fullPayload.userId, fullPayload.sessionId));
    if (!authSession) {
      throw new VideoTokenError("INVALID_VIDEO_TOKEN", 401, "Inactive session.");
    }

    const refreshToken = await refreshTokenRepository.findByHash(hashToken(rawRefreshToken));
    if (!refreshToken || refreshToken.revokedAt || refreshToken.expiresAt <= new Date()) {
      throw new VideoTokenError("INVALID_VIDEO_TOKEN", 401, "Invalid session.");
    }

    // Use cached enrollment check (Redis-backed) instead of a raw DB query.
    const enrollmentStatus = await enrollmentService.getStatus(fullPayload.userId);
    if (!enrollmentStatus.enrolled || enrollmentStatus.status !== "ACTIVE") {
      throw new VideoTokenError("INVALID_VIDEO_TOKEN", 401, "Invalid video token.");
    }

    return payload;
  },

  async issuePreviewToken(lessonId: string) {
    const previewToken = signPreviewToken({ lessonId, isPreview: true });
    // Store AES key in Redis with the special preview session ID.
    await videoTokenService.getSessionKey(`preview:${lessonId}`, lessonId);
    return {
      videoToken: previewToken,
      hlsUrl: `/api/v1/video/${lessonId}/playlist.m3u8?token=${encodeURIComponent(previewToken)}`
    };
  },

  async getSessionKey(sessionId: string, lessonId: string) {
    const keyName = sessionKeyCacheKey(sessionId, lessonId);
    const cached = await redis.get(keyName);
    if (cached) {
      return Buffer.from(cached, "base64");
    }

    const nextKey = crypto.randomBytes(16);
    // Preview keys get a slightly longer TTL (15 min) than normal tokens.
    const ttl = sessionId.startsWith("preview:") ? 15 * 60 : TOKEN_TTL_SECONDS;
    await redis.set(keyName, nextKey.toString("base64"), "EX", ttl);
    return nextKey;
  },

  async revokeSession(_userId: string, sessionId: string) {
    await videoTokenRepository.revokeBySession(sessionId);
  },

  async revokeUser(userId: string) {
    await videoTokenRepository.revokeByUser(userId);
  }
};
