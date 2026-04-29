import type { AttemptType } from "@prisma/client";
import type { Request } from "express";

import { env } from "../config/env.js";
import type { AttemptCounterService, IdentifierType } from "./attempt-counter.service.js";
import type { AttemptLogService } from "./attempt-log.service.js";
import type { BanService } from "./ban.service.js";
import type { CaptchaService } from "./captcha.service.js";
import type { FingerprintService } from "./fingerprint.service.js";
import { LOCKOUT_RESET_VALUES, type LockoutIdentifierType, type LockoutService } from "./lockout.service.js";
import type { ProtectionNotificationService } from "./protection-notification.service.js";
import type { WhitelistService } from "./whitelist.service.js";

export interface ProtectionContext {
  ip: string;
  email: string | null;
  fingerprintHash: string | null;
  fingerprintId: string | null;
  attemptType: AttemptType;
  captchaToken?: string;
  userId?: string | null;
  req: Request;
}

export interface ProtectionDecision {
  allowed: boolean;
  reason?: "BAN_ACTIVE" | "ACCOUNT_LOCKED" | "CAPTCHA_REQUIRED" | "CAPTCHA_INVALID";
  retryAfter?: number;
  captchaRequired?: boolean;
  delayMs?: number;
}

interface OrchestratorDeps {
  attemptCounterService: AttemptCounterService;
  lockoutService: LockoutService;
  banService: BanService;
  whitelistService: WhitelistService;
  captchaService: CaptchaService;
  attemptLogService: AttemptLogService;
  fingerprintService: FingerprintService;
  protectionNotificationService: ProtectionNotificationService;
}

const LOCKOUT_LEVEL_1 = 1;
const LOCKOUT_LEVEL_2 = 2;
const LOCKOUT_LEVEL_3 = 3;

const delay = async (ms: number): Promise<void> => {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
};

export class ProtectionOrchestrator {
  constructor(private readonly deps: OrchestratorDeps) {}

  async checkIncoming(context: ProtectionContext): Promise<ProtectionDecision> {
    try {
      const whitelisted = await this.deps.whitelistService.isWhitelisted(context.ip);
      if (whitelisted) {
        return { allowed: true, delayMs: 0 };
      }

      if (context.attemptType === "REGISTER") {
        const floodDecision = await this.checkRegFlood(context);
        if (floodDecision) return floodDecision;
      }

      const activeBan = await this.deps.banService.checkActiveBan(
        context.ip,
        context.email,
        context.fingerprintHash
      );

      if (activeBan) {
        this.deps.attemptLogService.log({
          type: context.attemptType,
          result: "BLOCKED_BAN",
          ipAddress: context.ip,
          emailAttempted: context.email,
          fingerprintId: context.fingerprintId,
          userAgent: context.req.headers["user-agent"] as string | undefined,
          metadata: { banId: activeBan.id }
        });

        return { allowed: false, reason: "BAN_ACTIVE" };
      }

      const lockouts = await Promise.all([
        this.deps.lockoutService.check("ip", context.ip),
        context.email ? this.deps.lockoutService.check("email", context.email) : Promise.resolve(null),
        context.fingerprintHash
          ? this.deps.lockoutService.check("fp", context.fingerprintHash)
          : Promise.resolve(null)
      ]);

      const activeLockout = lockouts.filter(Boolean).sort((a, b) => (b?.retryAfterSeconds ?? 0) - (a?.retryAfterSeconds ?? 0))[0] ?? null;
      if (activeLockout) {
        this.deps.attemptLogService.log({
          type: context.attemptType,
          result: "LOCKED_OUT",
          ipAddress: context.ip,
          emailAttempted: context.email,
          fingerprintId: context.fingerprintId,
          lockoutApplied: true,
          userAgent: context.req.headers["user-agent"] as string | undefined,
          metadata: { level: activeLockout.level }
        });

        return {
          allowed: false,
          reason: "ACCOUNT_LOCKED",
          retryAfter: activeLockout.retryAfterSeconds
        };
      }

      const captchaRequired = await this.deps.captchaService.isRequired(
        context.ip,
        context.email,
        context.fingerprintHash
      );

      if (captchaRequired) {
        if (!context.captchaToken) {
          return { allowed: false, reason: "CAPTCHA_REQUIRED", captchaRequired: true };
        }

        const verified = await this.deps.captchaService.verify(context.captchaToken, context.ip);
        if (!verified) {
          this.deps.attemptLogService.log({
            type: context.attemptType,
            result: "CAPTCHA_FAIL",
            ipAddress: context.ip,
            emailAttempted: context.email,
            fingerprintId: context.fingerprintId,
            captchaRequired: true,
            captchaPassed: false,
            userAgent: context.req.headers["user-agent"] as string | undefined
          });

          return { allowed: false, reason: "CAPTCHA_INVALID", captchaRequired: true };
        }
      }

      const maxCount = await this.getMaxAttemptCount(context);
      const shouldDelay = maxCount >= env.AUTH_CAPTCHA_THRESHOLD && maxCount < env.AUTH_LOCKOUT_L1_THRESHOLD;
      if (shouldDelay) {
        await delay(env.AUTH_DELAY_MS);
      }

      return { allowed: true, captchaRequired, delayMs: shouldDelay ? env.AUTH_DELAY_MS : 0 };
    } catch {
      return { allowed: true, delayMs: 0 };
    }
  }

  async recordOutcome(context: ProtectionContext, outcome: "success" | "failure"): Promise<void> {
    if (outcome === "success") {
      await this.resetAll(context);
      this.deps.attemptLogService.log({
        type: context.attemptType,
        result: "SUCCESS",
        ipAddress: context.ip,
        emailAttempted: context.email,
        fingerprintId: context.fingerprintId,
        userId: context.userId,
        userAgent: context.req.headers["user-agent"] as string | undefined
      });

      if (context.attemptType === "REGISTER") {
        await this.recordRegFlood(context);
      }
      return;
    }

    const ipCount = await this.deps.attemptCounterService.increment("ip", context.ip);
    const emailCount = context.email
      ? await this.deps.attemptCounterService.increment("email", context.email)
      : 0;
    const fpCount = context.fingerprintHash
      ? await this.deps.attemptCounterService.increment("fp", context.fingerprintHash)
      : 0;

    if (context.email) {
      await this.deps.attemptCounterService.trackEmailIp(context.email, context.ip);
    }

    const maxCount = Math.max(ipCount, emailCount, fpCount);

    if (maxCount >= env.AUTH_CAPTCHA_THRESHOLD) {
      await this.deps.attemptCounterService.setCaptchaRequired("ip", context.ip);
      if (context.email) await this.deps.attemptCounterService.setCaptchaRequired("email", context.email);
      if (context.fingerprintHash) await this.deps.attemptCounterService.setCaptchaRequired("fp", context.fingerprintHash);
    }

    if (maxCount >= env.AUTH_PERMANENT_BAN_THRESHOLD) {
      await this.deps.banService.createBan({
        banType: "IP",
        reason: "AUTO_PROGRESSIVE",
        ipAddress: context.ip,
        email: context.email ?? undefined,
        fingerprintId: context.fingerprintId ?? undefined,
        attemptCount: maxCount,
        isPermanent: true,
        expiresAt: null
      });

      await this.deps.protectionNotificationService.notifyAdminPermanentBan(
        context.ip,
        context.email,
        context.fingerprintHash,
        maxCount
      ).catch(() => undefined);
    } else if (maxCount >= env.AUTH_LOCKOUT_L3_THRESHOLD) {
      await this.applyLockoutForAll(context, LOCKOUT_LEVEL_3);
    } else if (maxCount >= env.AUTH_LOCKOUT_L2_THRESHOLD) {
      await this.applyLockoutForAll(context, LOCKOUT_LEVEL_2);

      if (context.email) {
        const distinctIpCount = await this.deps.attemptCounterService.trackEmailIp(context.email, context.ip);
        if (distinctIpCount >= env.AUTH_EMAIL_DISTINCT_IP_THRESHOLD) {
          await this.deps.protectionNotificationService
            .notifyStudentSuspiciousActivity(context.userId ?? "", context.email, context.ip)
            .catch(() => undefined);
        }
      }
    } else if (maxCount >= env.AUTH_LOCKOUT_L1_THRESHOLD) {
      await this.applyLockoutForAll(context, LOCKOUT_LEVEL_1);
    }

    this.deps.attemptLogService.log({
      type: context.attemptType,
      result: "FAIL_CREDENTIALS",
      ipAddress: context.ip,
      emailAttempted: context.email,
      fingerprintId: context.fingerprintId,
      attemptNumber: maxCount,
      lockoutApplied: maxCount >= env.AUTH_LOCKOUT_L1_THRESHOLD,
      banApplied: maxCount >= env.AUTH_PERMANENT_BAN_THRESHOLD,
      captchaRequired: maxCount >= env.AUTH_CAPTCHA_THRESHOLD,
      captchaPassed: context.captchaToken ? true : null,
      delayApplied: maxCount >= env.AUTH_CAPTCHA_THRESHOLD && maxCount < env.AUTH_LOCKOUT_L1_THRESHOLD ? env.AUTH_DELAY_MS : 0,
      userAgent: context.req.headers["user-agent"] as string | undefined
    });
  }

  private async getMaxAttemptCount(context: ProtectionContext): Promise<number> {
    const [ipCount, emailCount, fpCount] = await Promise.all([
      this.deps.attemptCounterService.getCount("ip", context.ip),
      context.email ? this.deps.attemptCounterService.getCount("email", context.email) : Promise.resolve(0),
      context.fingerprintHash
        ? this.deps.attemptCounterService.getCount("fp", context.fingerprintHash)
        : Promise.resolve(0)
    ]);

    return Math.max(ipCount, emailCount, fpCount);
  }

  private async resetAll(context: ProtectionContext): Promise<void> {
    await this.deps.attemptCounterService.reset("ip", context.ip, 0);
    await this.deps.attemptCounterService.clearCaptchaRequired("ip", context.ip);
    await this.deps.lockoutService.clear("ip", context.ip);

    if (context.email) {
      await this.deps.attemptCounterService.reset("email", context.email, 0);
      await this.deps.attemptCounterService.clearCaptchaRequired("email", context.email);
      await this.deps.lockoutService.clear("email", context.email);
    }

    if (context.fingerprintHash) {
      await this.deps.attemptCounterService.reset("fp", context.fingerprintHash, 0);
      await this.deps.attemptCounterService.clearCaptchaRequired("fp", context.fingerprintHash);
      await this.deps.lockoutService.clear("fp", context.fingerprintHash);
    }
  }

  private async checkRegFlood(context: ProtectionContext): Promise<ProtectionDecision | null> {
    try {
      const [ipLockout, fpLockout] = await Promise.all([
        this.deps.lockoutService.check("reg_ip", context.ip),
        context.fingerprintHash
          ? this.deps.lockoutService.check("reg_fp", context.fingerprintHash)
          : Promise.resolve(null)
      ]);

      const activeLockout = [ipLockout, fpLockout]
        .filter(Boolean)
        .sort((a, b) => (b?.retryAfterSeconds ?? 0) - (a?.retryAfterSeconds ?? 0))[0] ?? null;

      if (activeLockout) {
        this.deps.attemptLogService.log({
          type: context.attemptType,
          result: "FLOOD_LIMIT",
          ipAddress: context.ip,
          fingerprintId: context.fingerprintId,
          lockoutApplied: true,
          userAgent: context.req.headers["user-agent"] as string | undefined
        });
        return { allowed: false, reason: "ACCOUNT_LOCKED", retryAfter: activeLockout.retryAfterSeconds };
      }

      return null;
    } catch {
      return null;
    }
  }

  private async recordRegFlood(context: ProtectionContext): Promise<void> {
    try {
      const ipCount = await this.deps.attemptCounterService.incrementRegistrationCount("ip", context.ip);
      const fpCount = context.fingerprintHash
        ? await this.deps.attemptCounterService.incrementRegistrationCount("fp", context.fingerprintHash)
        : 0;
      const maxCount = Math.max(ipCount, fpCount);

      if (maxCount >= env.REG_FLOOD_HARD_THRESHOLD) {
        await this.deps.lockoutService.apply("reg_ip", context.ip, LOCKOUT_LEVEL_3);
        if (context.fingerprintHash) {
          await this.deps.lockoutService.apply("reg_fp", context.fingerprintHash, LOCKOUT_LEVEL_3);
        }
        await this.deps.protectionNotificationService
          .notifyAdminPermanentBan(context.ip, context.email, context.fingerprintHash, maxCount)
          .catch(() => undefined);
        this.deps.attemptLogService.log({
          type: context.attemptType,
          result: "FLOOD_LIMIT",
          ipAddress: context.ip,
          fingerprintId: context.fingerprintId,
          attemptNumber: maxCount,
          lockoutApplied: true,
          userAgent: context.req.headers["user-agent"] as string | undefined,
          metadata: { floodLevel: "hard" }
        });
      } else if (maxCount >= env.REG_FLOOD_MEDIUM_THRESHOLD) {
        await this.deps.lockoutService.apply("reg_ip", context.ip, LOCKOUT_LEVEL_2);
        if (context.fingerprintHash) {
          await this.deps.lockoutService.apply("reg_fp", context.fingerprintHash, LOCKOUT_LEVEL_2);
        }
        this.deps.attemptLogService.log({
          type: context.attemptType,
          result: "FLOOD_LIMIT",
          ipAddress: context.ip,
          fingerprintId: context.fingerprintId,
          attemptNumber: maxCount,
          lockoutApplied: true,
          userAgent: context.req.headers["user-agent"] as string | undefined,
          metadata: { floodLevel: "medium" }
        });
      }
    } catch {
      // fail-open by design
    }
  }

  private async applyLockoutForAll(context: ProtectionContext, level: 1 | 2 | 3): Promise<void> {
    const resetValue = LOCKOUT_RESET_VALUES[level];

    const apply = async (counterType: IdentifierType, lockoutType: LockoutIdentifierType, value: string) => {
      await this.deps.lockoutService.apply(lockoutType, value, level);
      await this.deps.attemptCounterService.reset(counterType, value, resetValue);
    };

    await apply("ip", "ip", context.ip);
    if (context.email) {
      await apply("email", "email", context.email);
    }
    if (context.fingerprintHash) {
      await apply("fp", "fp", context.fingerprintHash);
    }
  }
}
