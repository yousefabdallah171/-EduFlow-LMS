import type { NextFunction, Request, Response } from "express";
import { auditLogRepository } from "../repositories/audit-log.repository.js";

export const auditMiddleware = (req: Request, res: Response, next: NextFunction) => {
  res.on("finish", () => {
    const method = req.method.toUpperCase();
    if (!["POST", "PATCH", "DELETE"].includes(method)) return;
    if (res.statusCode < 200 || res.statusCode >= 400) return;
    const adminId = req.user?.userId;
    if (!adminId) return;

    const parts = req.path.split("/").filter(Boolean);
    const targetType = parts[0] ?? "";
    const targetId = parts[1] ?? "";

    void auditLogRepository.create({
      adminId,
      action: `${method} ${req.path}`,
      targetType,
      targetId,
      metadata: { body: req.body as unknown, status: res.statusCode }
    }).catch(() => { /* non-blocking */ });
  });
  next();
};
