import type { NextFunction, Request, Response } from "express";

import { videoSecurityEventRepository } from "../../repositories/video-security-event.repository.js";

export const adminVideoSecurityController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 20);
      const { eventType, severity, userId, sessionId, lessonId, previewSessionId, dateFrom, dateTo } = req.query as Record<
        string,
        string | undefined
      >;

      const [events, total] = await videoSecurityEventRepository.findPaginated(page, limit, {
        eventType,
        severity,
        userId,
        sessionId,
        lessonId,
        previewSessionId,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined
      });

      res.json({ events, total, page, limit });
    } catch (e) {
      next(e);
    }
  }
};

