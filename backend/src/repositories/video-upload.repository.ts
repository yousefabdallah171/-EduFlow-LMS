import type { Prisma, VideoUpload } from "@prisma/client";

import { prisma } from "../config/database.js";

export const videoUploadRepository = {
  create(data: Prisma.VideoUploadCreateInput): Promise<VideoUpload> {
    return prisma.videoUpload.create({ data });
  },

  findById(id: string): Promise<VideoUpload | null> {
    return prisma.videoUpload.findUnique({ where: { id } });
  },

  findByLessonId(lessonId: string): Promise<VideoUpload | null> {
    return prisma.videoUpload.findFirst({
      where: { lessonId, status: { in: ["UPLOADING", "COMPLETE", "PROCESSING"] } },
      orderBy: { createdAt: "desc" }
    });
  },

  listByUploader(uploadedById: string): Promise<VideoUpload[]> {
    return prisma.videoUpload.findMany({
      where: { uploadedById },
      orderBy: { createdAt: "desc" },
      take: 20
    });
  },

  updateOffset(id: string, offsetBytes: bigint): Promise<VideoUpload> {
    return prisma.videoUpload.update({
      where: { id },
      data: { offsetBytes }
    });
  },

  updateStatus(id: string, data: Prisma.VideoUploadUpdateInput): Promise<VideoUpload> {
    return prisma.videoUpload.update({
      where: { id },
      data
    });
  }
};
