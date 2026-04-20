import type { Prisma } from "@prisma/client";

import { prisma } from "../config/database.js";

export type VideoSecurityEventCreateInput = {
  userId?: string | null;
  sessionId?: string | null;
  lessonId?: string | null;
  previewSessionId?: string | null;
  eventType: string;
  severity?: "INFO" | "WARN" | "HIGH";
  ip?: string | null;
  userAgent?: string | null;
  fingerprint?: string | null;
  metadata?: Record<string, unknown>;
};

export const videoSecurityEventRepository = {
  create(input: VideoSecurityEventCreateInput) {
    return prisma.videoSecurityEvent.create({
      data: {
        userId: input.userId ?? null,
        sessionId: input.sessionId ?? null,
        lessonId: input.lessonId ?? null,
        previewSessionId: input.previewSessionId ?? null,
        eventType: input.eventType,
        severity: input.severity ?? "INFO",
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
        fingerprint: input.fingerprint ?? null,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue
      }
    });
  },

  findPaginated(
    page = 1,
    limit = 20,
    filters?: {
      eventType?: string;
      severity?: string;
      userId?: string;
      sessionId?: string;
      lessonId?: string;
      previewSessionId?: string;
      dateFrom?: Date;
      dateTo?: Date;
    }
  ) {
    const where: Record<string, unknown> = {};
    if (filters?.eventType) where.eventType = { contains: filters.eventType };
    if (filters?.severity) where.severity = filters.severity;
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.sessionId) where.sessionId = filters.sessionId;
    if (filters?.lessonId) where.lessonId = filters.lessonId;
    if (filters?.previewSessionId) where.previewSessionId = filters.previewSessionId;
    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {
        ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
        ...(filters.dateTo ? { lte: filters.dateTo } : {})
      };
    }

    return Promise.all([
      prisma.videoSecurityEvent.findMany({
        where,
        include: { user: { select: { id: true, fullName: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.videoSecurityEvent.count({ where })
    ]);
  }
};

