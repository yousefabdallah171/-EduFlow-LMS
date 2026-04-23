import type { Prisma } from "@prisma/client";

import { prisma } from "../config/database.js";

export const auditLogRepository = {
  create(data: { adminId: string; action: string; targetType?: string; targetId?: string; metadata?: Record<string, unknown> }) {
    return prisma.auditLog.create({
      data: {
        adminId: data.adminId,
        action: data.action,
        targetType: data.targetType ?? "",
        targetId: data.targetId ?? "",
        metadata: (data.metadata ?? {}) as Prisma.InputJsonValue
      }
    });
  },
  findPaginated(page = 1, limit = 20, filters?: { action?: string; dateFrom?: Date; dateTo?: Date }) {
    const where: Record<string, unknown> = {};
    if (filters?.action) where.action = { contains: filters.action };
    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {
        ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
        ...(filters.dateTo ? { lte: filters.dateTo } : {})
      };
    }
    return Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { admin: { select: { id: true, fullName: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.auditLog.count({ where })
    ]);
  }
};
