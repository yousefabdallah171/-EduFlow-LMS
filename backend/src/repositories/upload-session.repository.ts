import type { Prisma, UploadSession } from "@prisma/client";

import { prisma } from "../config/database.js";

export const uploadSessionRepository = {
  create(data: Prisma.UploadSessionCreateInput): Promise<UploadSession> {
    return prisma.uploadSession.create({ data });
  },

  findById(id: string): Promise<UploadSession | null> {
    return prisma.uploadSession.findUnique({ where: { id } });
  },

  findByToken(uploadSessionToken: string): Promise<UploadSession | null> {
    return prisma.uploadSession.findUnique({ where: { uploadSessionToken } });
  },

  update(id: string, data: Prisma.UploadSessionUpdateInput): Promise<UploadSession> {
    return prisma.uploadSession.update({
      where: { id },
      data
    });
  },

  listByAdmin(adminUserId: string, take = 100): Promise<UploadSession[]> {
    return prisma.uploadSession.findMany({
      where: { adminUserId },
      orderBy: { createdAt: "desc" },
      take
    });
  }
};
