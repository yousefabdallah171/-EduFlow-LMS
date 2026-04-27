import type { MediaFile, Prisma } from "@prisma/client";

import { prisma } from "../config/database.js";

export const mediaAssetRepository = {
  findById(id: string): Promise<MediaFile | null> {
    return prisma.mediaFile.findUnique({ where: { id } });
  },

  create(data: Prisma.MediaFileCreateInput): Promise<MediaFile> {
    return prisma.mediaFile.create({ data });
  },

  update(id: string, data: Prisma.MediaFileUpdateInput): Promise<MediaFile> {
    return prisma.mediaFile.update({
      where: { id },
      data
    });
  },

  listByStatus(status: Prisma.EnumMediaStatusFilter | undefined, take = 100): Promise<MediaFile[]> {
    return prisma.mediaFile.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      take
    });
  }
};
