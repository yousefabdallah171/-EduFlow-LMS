import { beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";

process.env.NODE_ENV = "test";
process.env.BACKEND_PORT ??= "3000";
process.env.DATABASE_URL ??= "postgresql://placeholder";
process.env.REDIS_URL ??= "redis://placeholder";
process.env.FRONTEND_URL ??= "http://localhost:5173";
process.env.JWT_ACCESS_SECRET ??= "test-access-secret-at-least-32-chars";
process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret-at-least-32-chars";
process.env.VIDEO_TOKEN_SECRET ??= "test-video-secret-at-least-32-chars";
process.env.PAYMOB_API_KEY ??= "test";
process.env.PAYMOB_HMAC_SECRET ??= "test";
process.env.PAYMOB_INTEGRATION_ID ??= "1";
process.env.PAYMOB_IFRAME_ID ??= "1";
process.env.GOOGLE_CLIENT_ID ??= "test";
process.env.GOOGLE_CLIENT_SECRET ??= "test";
process.env.SMTP_HOST ??= "localhost";
process.env.SMTP_PORT ??= "1025";
process.env.SMTP_USER ??= "test@example.com";
process.env.SMTP_PASS ??= "password";

const checkIncoming = vi.fn();
const recordOutcome = vi.fn();

vi.mock("../../src/services/security/index.js", () => ({
  protectionOrchestrator: {
    checkIncoming,
    recordOutcome
  },
  fingerprintService: {
    extractFromRequest: vi.fn().mockReturnValue(null),
    upsertFingerprint: vi.fn().mockResolvedValue(null)
  },
  whitelistService: { add: vi.fn().mockResolvedValue(undefined) },
  protectionNotificationService: { verifyAcknowledgeToken: vi.fn(), notifyAdminPermanentBan: vi.fn(), notifyStudentSuspiciousActivity: vi.fn() },
  attemptCounterService: { reset: vi.fn() },
  attemptLogService: { log: vi.fn() }
}));

let app: Express;

beforeAll(async () => {
  const appModule = await import("../../src/app.js");
  app = appModule.createApp();
});

describe("auth brute force integration", () => {
  it("returns CAPTCHA_REQUIRED when orchestrator requires captcha", async () => {
    checkIncoming.mockResolvedValueOnce({ allowed: false, reason: "CAPTCHA_REQUIRED" });

    const res = await request(app).post("/api/v1/auth/login").send({ email: "x@y.com", password: "x" }).expect(422);
    expect(res.body.error).toBe("CAPTCHA_REQUIRED");
  });

  it("returns ACCOUNT_LOCKED with Retry-After", async () => {
    checkIncoming.mockResolvedValueOnce({ allowed: false, reason: "ACCOUNT_LOCKED", retryAfter: 300 });

    const res = await request(app).post("/api/v1/auth/login").send({ email: "x@y.com", password: "x" }).expect(429);
    expect(res.headers["retry-after"]).toBe("300");
    expect(res.body.error).toBe("ACCOUNT_LOCKED");
  });

  it("returns BAN_ACTIVE when ban is active", async () => {
    checkIncoming.mockResolvedValueOnce({ allowed: false, reason: "BAN_ACTIVE" });

    const res = await request(app).post("/api/v1/auth/login").send({ email: "x@y.com", password: "x" }).expect(403);
    expect(res.body.error).toBe("BAN_ACTIVE");
  });

  it("allows request path and records failure outcome", async () => {
    checkIncoming.mockResolvedValueOnce({ allowed: true, delayMs: 0 });

    await request(app).post("/api/v1/auth/login").send({ email: "x@y.com", password: "bad" }).expect(401);
    expect(recordOutcome).toHaveBeenCalled();
  });
});
