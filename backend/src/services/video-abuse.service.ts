import crypto from "node:crypto";

import { redis } from "../config/redis.js";
import { videoSecurityEventRepository } from "../repositories/video-security-event.repository.js";

export class VideoAbuseError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

export type ClientContext = {
  ip: string | null;
  ipPrefix: string | null;
  userAgent: string | null;
  userAgentHash: string | null;
  fingerprint: string | null;
};

const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("hex");

export const getIpPrefix = (rawIp: string | undefined): string | null => {
  const ip = (rawIp ?? "").trim();
  if (!ip) return null;
  if (ip.includes(".")) {
    const parts = ip.split(".").filter(Boolean);
    return parts.length >= 3 ? `${parts[0]}.${parts[1]}.${parts[2]}` : ip;
  }
  if (ip.includes(":")) {
    const parts = ip.split(":").filter(Boolean);
    return parts.length >= 4 ? parts.slice(0, 4).join(":") : ip;
  }
  return ip;
};

export const getClientContext = (input: { ip?: string; userAgent?: string }): ClientContext => {
  const ip = (input.ip ?? "").trim() || null;
  const userAgent = (input.userAgent ?? "").trim() || null;
  const ipPrefix = getIpPrefix(ip ?? undefined);
  const userAgentHash = userAgent ? sha256(userAgent) : null;
  const fingerprint = userAgentHash && ipPrefix ? sha256(`${userAgentHash}|${ipPrefix}`) : null;

  return { ip, ipPrefix, userAgent, userAgentHash, fingerprint };
};

const windowKey = (scope: string, subject: string, windowSeconds: number) => {
  const windowBucket = Math.floor(Date.now() / (windowSeconds * 1000));
  return `video-rl:${scope}:${subject}:${windowBucket}`;
};

const leaseKey = (userId: string, sessionId: string) => `video-lease:${userId}:${sessionId}`;

const previewLeaseKey = (previewSessionId: string) => `video-lease-preview:${previewSessionId}`;

export const videoAbuseService = {
  async enforceRateLimit(options: {
    scope: "playlist" | "key" | "segment";
    subject: string;
    maxPerWindow: number;
    windowSeconds?: number;
    event?: {
      userId?: string | null;
      sessionId?: string | null;
      lessonId?: string | null;
      previewSessionId?: string | null;
      client: ClientContext;
    };
  }) {
    const windowSeconds = options.windowSeconds ?? 60;
    const key = windowKey(options.scope, options.subject, windowSeconds);
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, Math.max(windowSeconds * 2, 120));
    }

    if (count <= options.maxPerWindow) return;

    if (options.event) {
      const { client } = options.event;
      void videoSecurityEventRepository
        .create({
          userId: options.event.userId ?? null,
          sessionId: options.event.sessionId ?? null,
          lessonId: options.event.lessonId ?? null,
          previewSessionId: options.event.previewSessionId ?? null,
          eventType: `VIDEO_RATE_LIMIT_${options.scope.toUpperCase()}`,
          severity: "WARN",
          ip: client.ip,
          userAgent: client.userAgent,
          fingerprint: client.fingerprint,
          metadata: { subject: options.subject, count, max: options.maxPerWindow, windowSeconds }
        })
        .catch(() => undefined);
    }

    throw new VideoAbuseError("RATE_LIMITED", 429, "Too many requests.");
  },

  async enforceConcurrency(options: {
    userId?: string | null;
    sessionId?: string | null;
    previewSessionId?: string | null;
    lessonId?: string | null;
    client: ClientContext;
    ttlSeconds?: number;
  }) {
    const ttlSeconds = options.ttlSeconds ?? 90;
    const fingerprint = options.client.fingerprint;
    if (!fingerprint) return;

    const key =
      options.previewSessionId ? previewLeaseKey(options.previewSessionId) : options.userId && options.sessionId ? leaseKey(options.userId, options.sessionId) : null;
    if (!key) return;

    const existing = await redis.get(key);
    if (!existing) {
      await redis.set(key, fingerprint, "EX", ttlSeconds, "NX");
      return;
    }

    if (existing === fingerprint) {
      await redis.expire(key, ttlSeconds);
      return;
    }

    void videoSecurityEventRepository
      .create({
        userId: options.userId ?? null,
        sessionId: options.sessionId ?? null,
        lessonId: options.lessonId ?? null,
        previewSessionId: options.previewSessionId ?? null,
        eventType: "VIDEO_CONCURRENCY_VIOLATION",
        severity: "HIGH",
        ip: options.client.ip,
        userAgent: options.client.userAgent,
        fingerprint,
        metadata: { existingFingerprint: existing }
      })
      .catch(() => undefined);

    throw new VideoAbuseError("CONCURRENT_STREAM_LIMIT", 429, "Concurrent playback limit reached.");
  }
};

