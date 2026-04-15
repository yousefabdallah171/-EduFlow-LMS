import type { NextFunction, Request, Response } from "express";
import { auditLogRepository } from "../../repositories/audit-log.repository.js";

export const adminAuditController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 20);
      const { action, dateFrom, dateTo } = req.query as Record<string, string | undefined>;
      const [logs, total] = await auditLogRepository.findPaginated(page, limit, {
        action,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined
      });
      res.json({ logs, total, page, limit });
    } catch (e) { next(e); }
  }
};
