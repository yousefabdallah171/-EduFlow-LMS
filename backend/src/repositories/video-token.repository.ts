import type { Prisma, VideoToken } from "@prisma/client";

import { prisma } from "../config/database.js";

export const videoTokenRepository = {
  create(data: Prisma.VideoTokenCreateInput): Promise<VideoToken> {
    return prisma.videoToken.create({ data });
  },

  findByHash(tokenHash: string): Promise<VideoToken | null> {
    return prisma.videoToken.findUnique({ where: { tokenHash } });
  },

  revokeBySession(sessionId: string): Promise<Prisma.BatchPayload> {
    return prisma.videoToken.updateMany({
      where: {
        sessionId,
        revokedAt: null
      },
      data: {
        revokedAt: new Date()
      }
    });
  },

  revokeByUser(userId: string): Promise<Prisma.BatchPayload> {
    return prisma.videoToken.updateMany({
      where: {
        userId,
        revokedAt: null
      },
      data: {
        revokedAt: new Date()
      }
    });
  },

  revokeBySessionAndLesson(sessionId: string, lessonId: string): Promise<Prisma.BatchPayload> {
    return prisma.videoToken.updateMany({
      where: {
        sessionId,
        lessonId,
        revokedAt: null
      },
      data: {
        revokedAt: new Date()
      }
    });
  }
};
