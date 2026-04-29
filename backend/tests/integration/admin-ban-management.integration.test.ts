import { beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import type { Express } from "express";

process.env.NODE_ENV = "test";
process.env.ENFORCE_SINGLE_SESSION = "false";
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

const createBan = vi.fn();
const listBans = vi.fn();
const checkActiveBan = vi.fn();
const liftBan = vi.fn();

vi.mock("../../src/services/security/index.js", () => ({
  banService: {
    createBan,
    listBans,
    checkActiveBan,
    liftBan,
    extendBan: vi.fn(),
    getStats: vi.fn().mockResolvedValue({ activeBans: 0, bansToday: 0, attemptsBlockedToday: 0 })
  },
  whitelistService: { add: vi.fn(), list: vi.fn().mockResolvedValue([]), remove: vi.fn() },
  attemptLogService: { listLogs: vi.fn().mockResolvedValue({ data: [], total: 0 }), log: vi.fn() },
  protectionOrchestrator: { checkIncoming: vi.fn().mockResolvedValue({ allowed: true }), recordOutcome: vi.fn() },
  fingerprintService: { extractFromRequest: vi.fn().mockReturnValue(null), upsertFingerprint: vi.fn().mockResolvedValue(null) },
  protectionNotificationService: { verifyAcknowledgeToken: vi.fn(), notifyAdminPermanentBan: vi.fn(), notifyStudentSuspiciousActivity: vi.fn() },
  attemptCounterService: { reset: vi.fn() }
}));

vi.mock("../../src/config/database.js", () => ({
  prisma: {
    securityWhitelist: { count: vi.fn().mockResolvedValue(0) },
    auditLog: { create: vi.fn().mockResolvedValue(undefined) }
  }
}));

let app: Express;

const makeToken = (role: "ADMIN" | "STUDENT") =>
  jwt.sign(
    { userId: `${role.toLowerCase()}-1`, role, sessionId: "session-1" },
    process.env.JWT_ACCESS_SECRET as string,
    { expiresIn: "15m", issuer: "eduflow-api", audience: "eduflow-app" }
  );

beforeAll(async () => {
  const appModule = await import("../../src/app.js");
  app = appModule.createApp();
});

describe("admin ban management integration", () => {
  it("allows admin to create/list/lift bans", async () => {
    createBan.mockResolvedValue({ id: "ban-1", banType: "IP", reason: "MANUAL_ADMIN", ipAddress: "1.2.3.4" });
    listBans.mockResolvedValue({ data: [{ id: "ban-1", banType: "IP", reason: "MANUAL_ADMIN", ipAddress: "1.2.3.4" }], total: 1 });
    checkActiveBan.mockResolvedValueOnce({ id: "ban-1" }).mockResolvedValue(null);

    const adminToken = makeToken("ADMIN");

    await request(app)
      .post("/api/v1/admin/security/bans")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ banType: "IP", reason: "MANUAL_ADMIN", ipAddress: "1.2.3.4", durationSeconds: 3600 })
      .expect(201);

    const bansRes = await request(app)
      .get("/api/v1/admin/security/bans")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(bansRes.body.data.length).toBe(1);

    await request(app)
      .delete("/api/v1/admin/security/bans/ban-1")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason: "done" })
      .expect(200);

    expect(liftBan).toHaveBeenCalledWith("ban-1", "admin-1", "done");
  });

  it("blocks non-admin access", async () => {
    const studentToken = makeToken("STUDENT");
    await request(app)
      .post("/api/v1/admin/security/bans")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ banType: "IP", reason: "MANUAL_ADMIN", ipAddress: "1.2.3.4" })
      .expect(403);
  });
});
