import type { Prisma, UploadChunkCheckpoint } from "@prisma/client";

import { prisma } from "../config/database.js";

export const uploadChunkCheckpointRepository = {
  create(data: Prisma.UploadChunkCheckpointCreateInput): Promise<UploadChunkCheckpoint> {
    return prisma.uploadChunkCheckpoint.create({ data });
  },

  upsertByChunk(
    uploadSessionId: string,
    chunkIndex: number,
    data: Omit<Prisma.UploadChunkCheckpointUncheckedCreateInput, "id" | "uploadSessionId" | "chunkIndex">
  ): Promise<UploadChunkCheckpoint> {
    return prisma.uploadChunkCheckpoint.upsert({
      where: {
        uploadSessionId_chunkIndex: {
          uploadSessionId,
          chunkIndex
        }
      },
      update: {
        chunkSizeBytes: data.chunkSizeBytes,
        chunkChecksum: data.chunkChecksum,
        acknowledgedAt: data.acknowledgedAt,
        isFinalChunk: data.isFinalChunk
      },
      create: {
        uploadSessionId,
        chunkIndex,
        chunkSizeBytes: data.chunkSizeBytes,
        chunkChecksum: data.chunkChecksum,
        acknowledgedAt: data.acknowledgedAt,
        isFinalChunk: data.isFinalChunk
      }
    });
  },

  listForSession(uploadSessionId: string): Promise<UploadChunkCheckpoint[]> {
    return prisma.uploadChunkCheckpoint.findMany({
      where: { uploadSessionId },
      orderBy: { chunkIndex: "asc" }
    });
  }
};
