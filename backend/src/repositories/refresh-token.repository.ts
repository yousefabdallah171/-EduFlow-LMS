import type { Prisma, RefreshToken } from "@prisma/client";

import { prisma } from "../config/database.js";

export const refreshTokenRepository = {
  create(data: Prisma.RefreshTokenCreateInput): Promise<RefreshToken> {
    return prisma.refreshToken.create({ data });
  },

  findByHash(tokenHash: string): Promise<RefreshToken | null> {
    return prisma.refreshToken.findUnique({ where: { tokenHash } });
  },

  findActiveByUser(userId: string): Promise<RefreshToken[]> {
    return prisma.refreshToken.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() }
      }
    });
  },

  revokeByHash(tokenHash: string): Promise<RefreshToken> {
    return prisma.refreshToken.update({
      where: { tokenHash },
      data: { revokedAt: new Date() }
    });
  },

  revokeByFamily(familyId: string): Promise<Prisma.BatchPayload> {
    return prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() }
    });
  },

  revokeBySession(userId: string, sessionId: string): Promise<Prisma.BatchPayload> {
    return prisma.refreshToken.updateMany({
      where: {
        userId,
        sessionId,
        revokedAt: null
      },
      data: { revokedAt: new Date() }
    });
  },

  revokeByUser(userId: string): Promise<Prisma.BatchPayload> {
    return prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null
      },
      data: { revokedAt: new Date() }
    });
  }
};
