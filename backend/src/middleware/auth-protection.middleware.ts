import type { Request, Response, NextFunction } from "express";

import { extractIp } from "../utils/ip-extractor.js";
import { protectionOrchestrator, fingerprintService } from "../services/security/index.js";
import type { ProtectionContext } from "../services/protection-orchestrator.service.js";

type AuthAttemptType = "LOGIN" | "REGISTER" | "PASSWORD_RESET" | "RESEND_VERIFICATION";

const getFailureStatus = (status: number): boolean => status >= 400;

export const authProtectionMiddleware = (attemptType: AuthAttemptType) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const ip = extractIp(req);
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : null;
    const fingerprintHash = fingerprintService.extractFromRequest(req);
    const captchaToken = typeof req.body?.captchaToken === "string" ? req.body.captchaToken : undefined;

    let fingerprintId: string | null = null;
    if (fingerprintHash) {
      const fp = await fingerprintService.upsertFingerprint(fingerprintHash).catch(() => null);
      fingerprintId = fp?.id ?? null;
    }

    const context: ProtectionContext = {
      ip,
      email,
      fingerprintHash,
      fingerprintId,
      attemptType,
      captchaToken,
      req
    };

    const decision = await protectionOrchestrator.checkIncoming(context);

    if (!decision.allowed) {
      if (decision.reason === "BAN_ACTIVE") {
        res.status(403).json({ error: "BAN_ACTIVE" });
        return;
      }

      if (decision.reason === "ACCOUNT_LOCKED") {
        if (decision.retryAfter) {
          res.setHeader("Retry-After", String(decision.retryAfter));
        }
        res.status(429).json({ error: "ACCOUNT_LOCKED", retryAfter: decision.retryAfter ?? 0 });
        return;
      }

      if (decision.reason === "CAPTCHA_REQUIRED") {
        res.status(422).json({ error: "CAPTCHA_REQUIRED", captchaRequired: true });
        return;
      }

      if (decision.reason === "CAPTCHA_INVALID") {
        res.status(422).json({ error: "CAPTCHA_INVALID", captchaRequired: true });
        return;
      }
    }

    (req as Request & { protectionContext?: ProtectionContext }).protectionContext = context;

    res.on("finish", () => {
      const outcome = getFailureStatus(res.statusCode) ? "failure" : "success";
      void protectionOrchestrator.recordOutcome(context, outcome);
    });

    next();
  };
};
