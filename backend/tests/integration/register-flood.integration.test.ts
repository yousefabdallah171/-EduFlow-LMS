import { beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";

process.env.NODE_ENV = "test";
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

vi.mock("../../src/services/security/index.js", () => ({
  protectionOrchestrator: {
    checkIncoming,
    recordOutcome: vi.fn()
  },
  fingerprintService: {
    extractFromRequest: vi.fn().mockReturnValue("a".repeat(64)),
    upsertFingerprint: vi.fn().mockResolvedValue({ id: "fp-1" })
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

describe("register flood integration", () => {
  it("returns CAPTCHA_REQUIRED when flood hits captcha tier", async () => {
    checkIncoming.mockResolvedValueOnce({ allowed: false, reason: "CAPTCHA_REQUIRED" });
    await request(app).post("/api/v1/auth/register").send({ fullName: "A", email: "a@b.com", password: "Secure123A" }).expect(422);
  });

  it("returns lockout for medium flood", async () => {
    checkIncoming.mockResolvedValueOnce({ allowed: false, reason: "ACCOUNT_LOCKED", retryAfter: 1800 });
    const res = await request(app).post("/api/v1/auth/register").send({ fullName: "A", email: "a@b.com", password: "Secure123A" }).expect(429);
    expect(res.body.error).toBe("ACCOUNT_LOCKED");
  });
});
