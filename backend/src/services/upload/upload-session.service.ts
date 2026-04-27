import crypto from "node:crypto";
import path from "node:path";

import type { MediaType, UploadSession } from "@prisma/client";

import { prisma } from "../../config/database.js";
import { env } from "../../config/env.js";
import { uploadSessionRepository } from "../../repositories/upload-session.repository.js";
import { duplicateResolutionService } from "./duplicate-resolution.service.js";
import { uploadValidationService } from "./upload-validation.service.js";
import type { UploadSessionState } from "./upload.types.js";

type CreateUploadSessionInput = {
  adminUserId: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  duplicatePolicy?: string;
};

type UploadSessionSummary = UploadSessionState & {
  maxAcknowledgedChunkIndex: number;
};

const parseAllowedMimeTypes = () =>
  env.UPLOAD_ALLOWED_MIME_TYPES.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

const resolveMediaType = (mimeType: string): MediaType => {
  const normalizedMimeType = mimeType.toLowerCase();

  if (normalizedMimeType.startsWith("video/")) {
    return "VIDEO";
  }

  if (normalizedMimeType.startsWith("image/")) {
    return "IMAGE";
  }

  if (normalizedMimeType.includes("pdf")) {
    return "PDF";
  }

  if (normalizedMimeType.includes("word") || normalizedMimeType.includes("sheet")) {
    return "DOCUMENT";
  }

  return "OTHER";
};

const createUploadSessionToken = () => `upl_${crypto.randomUUID().replaceAll("-", "")}`;

const toChunkRange = (fileSizeBytes: number, chunkSizeBytes: number) => {
  const maxChunkIndex = Math.max(Math.ceil(fileSizeBytes / chunkSizeBytes) - 1, 0);
  return { maxChunkIndex };
};

const getUploadedBytesAndMaxAcknowledged = async (sessionId: string) => {
  const checkpoints = await prisma.uploadChunkCheckpoint.findMany({
    where: { uploadSessionId: sessionId },
    orderBy: { chunkIndex: "asc" }
  });

  const uploadedBytes = checkpoints.reduce((sum, checkpoint) => sum + checkpoint.chunkSizeBytes, 0);
  const maxAcknowledgedChunkIndex = checkpoints.length > 0 ? checkpoints[checkpoints.length - 1].chunkIndex : -1;

  return {
    uploadedBytes,
    maxAcknowledgedChunkIndex
  };
};

export const uploadSessionService = {
  async createSession(input: CreateUploadSessionInput) {
    if (typeof input.fileName !== "string") {
      throw new Error("FILE_NAME_REQUIRED");
    }

    const fileName = input.fileName.trim();
    if (!fileName) {
      throw new Error("FILE_NAME_REQUIRED");
    }

    if (typeof input.mimeType !== "string") {
      throw new Error("MIME_TYPE_REQUIRED");
    }

    const normalizedMimeType = input.mimeType.trim().toLowerCase();
    const validation = await uploadValidationService.validatePreUpload({
      adminUserId: input.adminUserId,
      fileName,
      fileSizeBytes: input.fileSizeBytes,
      mimeType: normalizedMimeType
    });

    const blockingIssue = validation.issues.find((issue) => issue.level === "ERROR");
    if (blockingIssue) {
      throw new Error(blockingIssue.code);
    }

    await duplicateResolutionService.resolve({
      adminUserId: input.adminUserId,
      fileName,
      duplicatePolicy: input.duplicatePolicy
    });

    const allowedMimeTypes = parseAllowedMimeTypes();
    if (!allowedMimeTypes.includes(normalizedMimeType)) {
      throw new Error("UPLOAD_UNSUPPORTED_FILE_TYPE");
    }

    const chunkSizeBytes = Math.min(Math.max(env.UPLOAD_DEFAULT_CHUNK_SIZE_BYTES, env.UPLOAD_MIN_CHUNK_SIZE_BYTES), env.UPLOAD_MAX_CHUNK_SIZE_BYTES);

    const { maxChunkIndex } = toChunkRange(input.fileSizeBytes, chunkSizeBytes);
    const session = await uploadSessionRepository.create({
      adminUser: { connect: { id: input.adminUserId } },
      uploadProtocol: env.UPLOAD_PROTOCOL,
      sourceFileName: fileName,
      sourceFileSizeBytes: BigInt(input.fileSizeBytes),
      mimeType: normalizedMimeType,
      status: "QUEUED",
      chunkSizeBytes,
      nextChunkIndex: 0,
      maxChunkIndex,
      uploadSessionToken: createUploadSessionToken()
    });

    return {
      sessionId: session.id,
      uploadUrl: `/api/v1/admin/uploads/sessions/${session.id}/chunks`,
      protocol: session.uploadProtocol,
      initialChunkSizeBytes: session.chunkSizeBytes,
      resumeFromChunkIndex: session.nextChunkIndex,
      status: session.status
    };
  },

  async getSessionSummary(sessionId: string): Promise<UploadSessionSummary> {
    const session = await uploadSessionRepository.findById(sessionId);
    if (!session) {
      throw new Error("UPLOAD_SESSION_NOT_FOUND");
    }

    const { uploadedBytes, maxAcknowledgedChunkIndex } = await getUploadedBytesAndMaxAcknowledged(sessionId);

    return {
      sessionId: session.id,
      status: session.status,
      chunkSizeBytes: session.chunkSizeBytes,
      nextChunkIndex: session.nextChunkIndex,
      maxChunkIndex: session.maxChunkIndex,
      retryAttempt: session.retryAttempt,
      retryNextAt: session.retryNextAt?.toISOString() ?? null,
      uploadedBytes,
      fileSizeBytes: Number(session.sourceFileSizeBytes),
      maxAcknowledgedChunkIndex
    };
  },

  async markSessionUploading(sessionId: string, nextChunkIndex: number): Promise<UploadSession> {
    return uploadSessionRepository.update(sessionId, {
      status: "UPLOADING",
      nextChunkIndex
    });
  },

  async completeSession(sessionId: string) {
    const session = await uploadSessionRepository.findById(sessionId);
    if (!session) {
      throw new Error("UPLOAD_SESSION_NOT_FOUND");
    }

    if (["FAILED", "CANCELLED"].includes(session.status)) {
      throw new Error("UPLOAD_SESSION_ALREADY_COMPLETED");
    }

    const existingMediaAsset = await prisma.mediaFile.findFirst({
      where: { uploadSessionId: session.id },
      select: { id: true }
    });

    const mediaAsset =
      existingMediaAsset ??
      (await prisma.mediaFile.create({
        data: {
          title: path.parse(session.sourceFileName).name || session.sourceFileName,
          type: resolveMediaType(session.mimeType),
          status: "PROCESSING",
          originalFilename: session.sourceFileName,
          storagePath: session.storageObjectKey ?? null,
          mimeType: session.mimeType,
          sizeBytes: session.sourceFileSizeBytes,
          uploadedBy: { connect: { id: session.adminUserId } },
          uploadSession: { connect: { id: session.id } }
        },
        select: { id: true }
      }));

    await uploadSessionRepository.update(session.id, {
      status: "PROCESSING"
    });

    return {
      sessionId: session.id,
      mediaAssetId: mediaAsset.id,
      status: "PROCESSING" as const
    };
  }
};
