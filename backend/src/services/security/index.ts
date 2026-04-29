import { prisma } from "../../config/database.js";
import { redis } from "../../config/redis.js";
import { AttemptCounterService } from "../attempt-counter.service.js";
import { AttemptLogService } from "../attempt-log.service.js";
import { BanService } from "../ban.service.js";
import { CaptchaService } from "../captcha.service.js";
import { FingerprintService } from "../fingerprint.service.js";
import { LockoutService } from "../lockout.service.js";
import { ProtectionNotificationService } from "../protection-notification.service.js";
import { ProtectionOrchestrator } from "../protection-orchestrator.service.js";
import { WhitelistService } from "../whitelist.service.js";

export const fingerprintService = new FingerprintService(prisma);
export const attemptCounterService = new AttemptCounterService(redis);
export const lockoutService = new LockoutService(redis);
export const banService = new BanService(prisma, redis);
export const whitelistService = new WhitelistService(prisma, redis);
export const captchaService = new CaptchaService(redis);
export const attemptLogService = new AttemptLogService(prisma);
export const protectionNotificationService = new ProtectionNotificationService(prisma);

export const protectionOrchestrator = new ProtectionOrchestrator({
  attemptCounterService,
  lockoutService,
  banService,
  whitelistService,
  captchaService,
  attemptLogService,
  fingerprintService,
  protectionNotificationService
});
