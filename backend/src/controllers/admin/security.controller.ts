import type { Request, Response } from "express";
import { z } from "zod";

import { prisma } from "../../config/database.js";
import { attemptCounterService, attemptLogService, banService, lockoutService, whitelistService } from "../../services/security/index.js";

const listLogsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  type: z.enum(["LOGIN", "REGISTER", "PASSWORD_RESET", "RESEND_VERIFICATION"]).optional(),
  result: z
    .enum(["SUCCESS", "FAIL_CREDENTIALS", "FAIL_NOT_VERIFIED", "BLOCKED_BAN", "LOCKED_OUT", "CAPTCHA_REQUIRED", "CAPTCHA_FAIL", "RATE_LIMITED", "FLOOD_LIMIT"])
    .optional(),
  ipAddress: z.string().optional(),
  email: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional()
});

const createBanSchema = z.object({
  banType: z.enum(["IP", "EMAIL", "FINGERPRINT", "IP_EMAIL", "IP_FINGERPRINT", "ALL"]),
  reason: z.enum(["AUTO_PROGRESSIVE", "AUTO_REGISTRATION_FLOOD", "MANUAL_ADMIN"]).default("MANUAL_ADMIN"),
  ipAddress: z.string().optional(),
  email: z.string().email().optional(),
  fingerprintId: z.string().optional(),
  notes: z.string().optional(),
  durationSeconds: z.coerce.number().int().positive().optional(),
  isPermanent: z.coerce.boolean().default(false)
});

const liftSchema = z.object({ reason: z.string().min(1) });
const extendSchema = z.object({ durationSeconds: z.coerce.number().int().positive() });
const whitelistSchema = z.object({ ipAddress: z.string().min(3), reason: z.string().optional() });

export const securityController = {
  async listLogs(req: Request, res: Response) {
    const query = listLogsSchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;

    const { data, total } = await attemptLogService.listLogs({
      type: query.type,
      result: query.result,
      ipAddress: query.ipAddress,
      email: query.email,
      from: query.from,
      to: query.to,
      limit: query.limit,
      offset
    });

    res.json({ data, pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) } });
  },

  async getStats(_req: Request, res: Response) {
    const stats = await banService.getStats();
    const whitelistedIps = await prisma.securityWhitelist.count();
    res.json({ ...stats, whitelistedIps });
  },

  async listBans(req: Request, res: Response) {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 50)));
    const offset = (page - 1) * limit;

    const { data, total } = await banService.listBans({
      isActive: req.query.isActive === undefined ? undefined : req.query.isActive === "true",
      banType: typeof req.query.banType === "string" ? (req.query.banType as never) : undefined,
      limit,
      offset
    });

    res.json({ data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  },

  async createBan(req: Request, res: Response) {
    const body = createBanSchema.parse(req.body);
    const expiresAt = body.isPermanent ? null : new Date(Date.now() + (body.durationSeconds ?? 3600) * 1000);

    const ban = await banService.createBan({
      banType: body.banType,
      reason: body.reason,
      notes: body.notes,
      ipAddress: body.ipAddress,
      email: body.email,
      fingerprintId: body.fingerprintId,
      isPermanent: body.isPermanent,
      expiresAt,
      createdById: req.user?.userId
    });

    await prisma.auditLog.create({
      data: {
        adminId: req.user?.userId ?? "",
        action: "SECURITY_BAN_CREATED",
        targetType: "SecurityBan",
        targetId: ban.id,
        metadata: { banType: ban.banType, ipAddress: ban.ipAddress, email: ban.email }
      }
    }).catch(() => undefined);

    res.status(201).json(ban);
  },

  async liftBan(req: Request, res: Response) {
    const body = liftSchema.parse(req.body);
    const ban = await banService.liftBan(req.params.id, req.user?.userId ?? "", body.reason);

    // Reset all attempt counters and lockouts so the user can log in immediately
    const resetOps: Promise<unknown>[] = [];
    if (ban.ipAddress) {
      resetOps.push(attemptCounterService.reset("ip", ban.ipAddress, 0));
      resetOps.push(attemptCounterService.clearCaptchaRequired("ip", ban.ipAddress));
      resetOps.push(lockoutService.clear("ip", ban.ipAddress));
      resetOps.push(lockoutService.clear("reg_ip", ban.ipAddress));
    }
    if (ban.email) {
      resetOps.push(attemptCounterService.reset("email", ban.email, 0));
      resetOps.push(attemptCounterService.clearCaptchaRequired("email", ban.email));
      resetOps.push(lockoutService.clear("email", ban.email));
    }
    if (ban.fingerprint?.hash) {
      resetOps.push(attemptCounterService.reset("fp", ban.fingerprint.hash, 0));
      resetOps.push(attemptCounterService.clearCaptchaRequired("fp", ban.fingerprint.hash));
      resetOps.push(lockoutService.clear("fp", ban.fingerprint.hash));
      resetOps.push(lockoutService.clear("reg_fp", ban.fingerprint.hash));
    }
    await Promise.allSettled(resetOps);

    await prisma.auditLog.create({
      data: {
        adminId: req.user?.userId ?? "",
        action: "SECURITY_BAN_LIFTED",
        targetType: "SecurityBan",
        targetId: req.params.id,
        metadata: { reason: body.reason }
      }
    }).catch(() => undefined);

    res.json({ success: true });
  },

  async extendBan(req: Request, res: Response) {
    const body = extendSchema.parse(req.body);
    const ban = await banService.extendBan(req.params.id, new Date(Date.now() + body.durationSeconds * 1000));

    await prisma.auditLog.create({
      data: {
        adminId: req.user?.userId ?? "",
        action: "SECURITY_BAN_EXTENDED",
        targetType: "SecurityBan",
        targetId: req.params.id,
        metadata: { expiresAt: ban.expiresAt?.toISOString() }
      }
    }).catch(() => undefined);

    res.json(ban);
  },

  async listWhitelist(_req: Request, res: Response) {
    const data = await whitelistService.list();
    res.json(data);
  },

  async addWhitelist(req: Request, res: Response) {
    const body = whitelistSchema.parse(req.body);
    const entry = await whitelistService.add(body.ipAddress, req.user?.userId ?? "", body.reason);
    res.status(201).json(entry);
  },

  async removeWhitelist(req: Request, res: Response) {
    await whitelistService.remove(req.params.id);
    res.json({ success: true });
  }
};
