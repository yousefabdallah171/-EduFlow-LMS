import { describe, expect, it, vi } from "vitest";

const baseContext = {
  ip: "1.1.1.1",
  email: "user@example.com",
  fingerprintHash: "a".repeat(64),
  fingerprintId: "fp-1",
  attemptType: "LOGIN" as const,
  req: { headers: {} } as never
};

const deps = () => ({
  attemptCounterService: {
    getCount: vi.fn().mockResolvedValue(0),
    increment: vi.fn().mockResolvedValue(1),
    setCaptchaRequired: vi.fn().mockResolvedValue(undefined),
    clearCaptchaRequired: vi.fn().mockResolvedValue(undefined),
    reset: vi.fn().mockResolvedValue(undefined),
    trackEmailIp: vi.fn().mockResolvedValue(1)
  },
  lockoutService: {
    check: vi.fn().mockResolvedValue(null),
    clear: vi.fn().mockResolvedValue(undefined),
    apply: vi.fn().mockResolvedValue(undefined)
  },
  banService: {
    checkActiveBan: vi.fn().mockResolvedValue(null),
    createBan: vi.fn().mockResolvedValue(undefined)
  },
  whitelistService: {
    isWhitelisted: vi.fn().mockResolvedValue(false)
  },
  captchaService: {
    isRequired: vi.fn().mockResolvedValue(false),
    verify: vi.fn().mockResolvedValue(true)
  },
  attemptLogService: {
    log: vi.fn()
  },
  fingerprintService: {
    getByHash: vi.fn(),
    upsertFingerprint: vi.fn(),
    extractFromRequest: vi.fn()
  },
  protectionNotificationService: {
    notifyStudentSuspiciousActivity: vi.fn().mockResolvedValue(undefined),
    notifyAdminPermanentBan: vi.fn().mockResolvedValue(undefined)
  }
});

describe("ProtectionOrchestrator", () => {
  it("allows whitelisted requests", async () => {
    process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://placeholder";
    process.env.REDIS_URL = process.env.REDIS_URL ?? "redis://placeholder";
    process.env.FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost";
    process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? "a".repeat(32);
    process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "b".repeat(32);
    process.env.VIDEO_TOKEN_SECRET = process.env.VIDEO_TOKEN_SECRET ?? "c".repeat(32);
    process.env.PAYMOB_API_KEY = process.env.PAYMOB_API_KEY ?? "x";
    process.env.PAYMOB_HMAC_SECRET = process.env.PAYMOB_HMAC_SECRET ?? "x";
    process.env.PAYMOB_INTEGRATION_ID = process.env.PAYMOB_INTEGRATION_ID ?? "x";
    process.env.PAYMOB_IFRAME_ID = process.env.PAYMOB_IFRAME_ID ?? "x";
    process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "x";
    process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "x";
    process.env.SMTP_HOST = process.env.SMTP_HOST ?? "x";
    process.env.SMTP_PORT = process.env.SMTP_PORT ?? "587";
    process.env.SMTP_USER = process.env.SMTP_USER ?? "x";
    process.env.SMTP_PASS = process.env.SMTP_PASS ?? "x";

    const { ProtectionOrchestrator } = await import("@/services/protection-orchestrator.service");
    const d = deps();
    d.whitelistService.isWhitelisted.mockResolvedValue(true);
    const orchestrator = new ProtectionOrchestrator(d as never);

    const decision = await orchestrator.checkIncoming(baseContext);
    expect(decision.allowed).toBe(true);
  });

  it("blocks banned and locked requests", async () => {
    const { ProtectionOrchestrator } = await import("@/services/protection-orchestrator.service");
    const d = deps();
    d.banService.checkActiveBan.mockResolvedValue({ id: "ban-1" });
    const orchestrator = new ProtectionOrchestrator(d as never);

    const banned = await orchestrator.checkIncoming(baseContext);
    expect(banned.allowed).toBe(false);
    expect(banned.reason).toBe("BAN_ACTIVE");

    d.banService.checkActiveBan.mockResolvedValue(null);
    d.lockoutService.check.mockResolvedValue({ level: 1, retryAfterSeconds: 100, expiresAt: new Date(Date.now() + 100000) });
    const locked = await orchestrator.checkIncoming(baseContext);
    expect(locked.reason).toBe("ACCOUNT_LOCKED");
  });

  it("records success and failure outcomes", async () => {
    const { ProtectionOrchestrator } = await import("@/services/protection-orchestrator.service");
    const d = deps();
    d.attemptCounterService.increment.mockResolvedValue(26);
    const orchestrator = new ProtectionOrchestrator(d as never);

    await orchestrator.recordOutcome(baseContext, "success");
    expect(d.attemptCounterService.reset).toHaveBeenCalled();

    await orchestrator.recordOutcome(baseContext, "failure");
    expect(d.banService.createBan).toHaveBeenCalled();
    expect(d.protectionNotificationService.notifyAdminPermanentBan).toHaveBeenCalled();
  });
});
