import { env } from "../../config/env.js";
import { uploadChunkCheckpointRepository } from "../../repositories/upload-chunk-checkpoint.repository.js";
import { uploadSessionRepository } from "../../repositories/upload-session.repository.js";
import { adaptiveChunkHintsService } from "./adaptive-chunk-hints.service.js";
import type { ChunkAcknowledgement } from "./upload.types.js";

type AcknowledgeChunkInput = {
  sessionId: string;
  chunkIndex: number;
  chunkChecksum: string;
  chunkSizeBytes: number;
  chunkDurationMs?: number;
};

const clampChunkSize = (chunkSizeBytes: number) =>
  Math.min(Math.max(chunkSizeBytes, env.UPLOAD_MIN_CHUNK_SIZE_BYTES), env.UPLOAD_MAX_CHUNK_SIZE_BYTES);

const getRecommendedChunkSize = (currentChunkSize: number, isFinalChunk: boolean) => {
  if (isFinalChunk) {
    return currentChunkSize;
  }

  return clampChunkSize(currentChunkSize);
};

export const chunkCheckpointService = {
  async acknowledgeChunk(input: AcknowledgeChunkInput): Promise<ChunkAcknowledgement> {
    if (!Number.isInteger(input.chunkIndex) || input.chunkIndex < 0) {
      throw new Error("UPLOAD_INVALID_CHUNK_INDEX");
    }

    if (!input.chunkChecksum.trim()) {
      throw new Error("UPLOAD_CHUNK_CHECKSUM_MISMATCH");
    }

    if (!Number.isFinite(input.chunkSizeBytes) || input.chunkSizeBytes <= 0) {
      throw new Error("UPLOAD_INVALID_CHUNK_INDEX");
    }

    const session = await uploadSessionRepository.findById(input.sessionId);
    if (!session) {
      throw new Error("UPLOAD_SESSION_NOT_FOUND");
    }

    if (session.status === "CANCELLED" || session.status === "FAILED") {
      throw new Error("UPLOAD_SESSION_ALREADY_COMPLETED");
    }

    if (input.chunkIndex > session.maxChunkIndex) {
      throw new Error("UPLOAD_INVALID_CHUNK_INDEX");
    }

    const normalizedChunkSizeBytes = clampChunkSize(input.chunkSizeBytes);
    const isFinalChunk = input.chunkIndex >= session.maxChunkIndex;
    const chunkHint = adaptiveChunkHintsService.getRecommendedChunkSize({
      previousChunkSizeBytes: normalizedChunkSizeBytes,
      chunkDurationMs: input.chunkDurationMs,
      retryAttempt: session.retryAttempt
    });
    const nextChunkIndex = Math.min(input.chunkIndex + 1, session.maxChunkIndex + 1);

    await uploadChunkCheckpointRepository.upsertByChunk(session.id, input.chunkIndex, {
      chunkSizeBytes: normalizedChunkSizeBytes,
      chunkChecksum: input.chunkChecksum,
      acknowledgedAt: new Date(),
      isFinalChunk
    });

    await uploadSessionRepository.update(session.id, {
      status: isFinalChunk ? "PROCESSING" : "UPLOADING",
      nextChunkIndex,
      chunkSizeBytes: chunkHint.recommendedChunkSizeBytes,
      retryAttempt: 0,
      retryNextAt: null
    });

    return {
      sessionId: session.id,
      acknowledgedChunkIndex: input.chunkIndex,
      nextChunkIndex,
      recommendedChunkSizeBytes: getRecommendedChunkSize(chunkHint.recommendedChunkSizeBytes, isFinalChunk),
      retryAdvice: {
        shouldBackoff: false,
        nextDelayMs: 0
      }
    };
  }
};
