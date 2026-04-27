import type { Request, Response, NextFunction } from "express";
import { redis } from "../config/redis.js";

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyGenerator?: (req: Request) => string;
  message?: string | { error: string; message: string };
  skipSuccessfulRequests?: boolean;
  skip?: (req: Request) => boolean;
}

const DEFAULT_KEY_GENERATOR = (req: Request): string =>
  req.user?.userId || req.ip || req.headers["x-forwarded-for"] || "unknown";

const createRedisRateLimiter = (options: RateLimitOptions) => {
  const windowMs = options.windowMs;
  const max = options.max;
  const keyGenerator = options.keyGenerator || DEFAULT_KEY_GENERATOR;
  const message = options.message || "Too many requests, please try again later.";
  const skipSuccessfulRequests = options.skipSuccessfulRequests ?? false;
  const skip = options.skip;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (skip?.(req)) {
        return next();
      }

      const key = `rate-limit:${keyGenerator(req)}`;
      const windowSeconds = Math.ceil(windowMs / 1000);
      const current = await redis.incr(key);

      if (current === 1) {
        await redis.expire(key, windowSeconds);
      }

      const remainingAttempts = Math.max(0, max - current);
      res.setHeader("RateLimit-Limit", max);
      res.setHeader("RateLimit-Remaining", remainingAttempts);
      res.setHeader("RateLimit-Reset", new Date(Date.now() + windowMs).toISOString());

      if (current > max) {
        const errorMessage = typeof message === "string" ? message : message.message;
        const errorCode = typeof message === "object" ? message.error : "TOO_MANY_REQUESTS";

        return res.status(429).json({
          error: errorCode,
          message: errorMessage,
          retryAfter: windowSeconds
        });
      }

      const originalJson = res.json.bind(res);
      res.json = function (body) {
        if (skipSuccessfulRequests && res.statusCode < 400) {
          redis.decr(key).catch(() => {});
        }
        return originalJson(body);
      };

      next();
    } catch (error) {
      console.error("[RateLimit] Redis error:", error);
      next();
    }
  };
};

export const createAuthRateLimit = (options?: Partial<RateLimitOptions>) =>
  createRedisRateLimiter({
    windowMs: 60 * 1000,
    max: process.env.NODE_ENV === "production" ? 10 : 1000,
    ...options
  });

export const createRefreshRateLimit = (options?: Partial<RateLimitOptions>) =>
  createRedisRateLimiter({
    windowMs: 60 * 1000,
    max: process.env.NODE_ENV === "production" ? 120 : 1000,
    ...options
  });

export const createPaymentRateLimit = (options?: Partial<RateLimitOptions>) =>
  createRedisRateLimiter({
    windowMs: 60 * 1000,
    max: process.env.NODE_ENV === "production" ? 20 : 1000,
    ...options
  });

export const createContactRateLimit = (options?: Partial<RateLimitOptions>) =>
  createRedisRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === "production" ? 5 : 1000,
    ...options
  });

export const createVideoIpRateLimit = (options?: Partial<RateLimitOptions>) =>
  createRedisRateLimiter({
    windowMs: 60 * 1000,
    max: process.env.NODE_ENV === "production" ? 300 : 10000,
    keyGenerator: (req) => req.ip || String(req.headers["x-forwarded-for"] || "unknown"),
    ...options
  });

export const createPasswordChangeRateLimit = (options?: Partial<RateLimitOptions>) =>
  createRedisRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: process.env.NODE_ENV === "production" ? 3 : 1000,
    keyGenerator: (req) => req.user?.userId || req.ip || "unknown",
    message: { error: "TOO_MANY_PASSWORD_CHANGE_ATTEMPTS", message: "Too many password change attempts. Please try again later." },
    ...options
  });

export const createAdminSearchRateLimit = (options?: Partial<RateLimitOptions>) =>
  createRedisRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === "production" ? 50 : 10000,
    keyGenerator: (req) => req.user?.userId || req.ip || "unknown",
    message: { error: "TOO_MANY_SEARCH_REQUESTS", message: "Too many search requests. Please try again after 15 minutes." },
    ...options
  });

export const createVideoPreviewRateLimit = (options?: Partial<RateLimitOptions>) =>
  createRedisRateLimiter({
    windowMs: 10 * 60 * 1000,
    max: process.env.NODE_ENV === "production" ? 30 : 10000,
    keyGenerator: (req) => req.ip || String(req.headers["x-forwarded-for"] || "unknown"),
    ...options
  });

export const createUploadRateLimit = (options?: Partial<RateLimitOptions>) =>
  createRedisRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: process.env.NODE_ENV === "production" ? 5 : 100,
    keyGenerator: (req) => req.user?.userId || req.ip || "unknown",
    message: { error: "TOO_MANY_UPLOADS", message: "Too many upload attempts. Please try again in 1 hour." },
    ...options
  });

export const createListRateLimit = (options?: Partial<RateLimitOptions>) =>
  createRedisRateLimiter({
    windowMs: 60 * 1000,
    max: process.env.NODE_ENV === "production" ? 60 : 10000,
    keyGenerator: (req) => req.user?.userId || req.ip || "unknown",
    ...options
  });

export const createEnrollmentRateLimit = (options?: Partial<RateLimitOptions>) =>
  createRedisRateLimiter({
    windowMs: 24 * 60 * 60 * 1000,
    max: process.env.NODE_ENV === "production" ? 10 : 1000,
    keyGenerator: (req) => req.ip || String(req.headers["x-forwarded-for"] || "unknown"),
    message: { error: "TOO_MANY_ENROLLMENT_ATTEMPTS", message: "Too many enrollment attempts. Please try again later." },
    ...options
  });

export const createEmailVerificationRateLimit = (options?: Partial<RateLimitOptions>) =>
  createRedisRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: process.env.NODE_ENV === "production" ? 5 : 100,
    keyGenerator: (req) => req.query.token ? `verify:${req.query.token}` : req.ip || "unknown",
    message: { error: "TOO_MANY_VERIFICATION_ATTEMPTS", message: "Too many verification attempts. Please try again later." },
    ...options
  });

// Singleton instances
export const authRateLimit = createAuthRateLimit();
export const refreshRateLimit = createRefreshRateLimit();
export const paymentRateLimit = createPaymentRateLimit();
export const contactRateLimit = createContactRateLimit();
export const videoIpRateLimit = createVideoIpRateLimit();
export const passwordChangeRateLimit = createPasswordChangeRateLimit();
export const adminSearchRateLimit = createAdminSearchRateLimit();
export const videoPreviewRateLimit = createVideoPreviewRateLimit();
export const uploadRateLimit = createUploadRateLimit();
export const listRateLimit = createListRateLimit();
export const enrollmentRateLimit = createEnrollmentRateLimit();
export const emailVerificationRateLimit = createEmailVerificationRateLimit();
