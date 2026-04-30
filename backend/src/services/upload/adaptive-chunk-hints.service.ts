import { env } from "../../config/env.js";

export type AdaptiveChunkHintInput = {
  previousChunkSizeBytes: number;
  chunkDurationMs?: number;
  retryAttempt?: number;
};

const clampChunkSize = (chunkSizeBytes: number) =>
  Math.min(Math.max(chunkSizeBytes, env.UPLOAD_MIN_CHUNK_SIZE_BYTES), env.UPLOAD_MAX_CHUNK_SIZE_BYTES);

const estimateThroughputKbps = (chunkSizeBytes: number, chunkDurationMs: number) => {
  if (!Number.isFinite(chunkDurationMs) || chunkDurationMs <= 0) {
    return null;
  }

  const bytesPerSecond = chunkSizeBytes / (chunkDurationMs / 1000);
  return (bytesPerSecond * 8) / 1024;
};

export const adaptiveChunkHintsService = {
  getRecommendedChunkSize(input: AdaptiveChunkHintInput) {
    const currentChunkSize = clampChunkSize(input.previousChunkSizeBytes);
    const retryAttempt = Math.max(0, Math.floor(input.retryAttempt ?? 0));

    if (retryAttempt > 0) {
      const reducedChunkSize = clampChunkSize(Math.floor(currentChunkSize * 0.6));
      return {
        recommendedChunkSizeBytes: reducedChunkSize,
        reason: "RETRY_RECOVERY"
      };
    }

    const throughputKbps = estimateThroughputKbps(currentChunkSize, input.chunkDurationMs ?? 0);
    if (throughputKbps === null) {
      return {
        recommendedChunkSizeBytes: currentChunkSize,
        reason: "INSUFFICIENT_TELEMETRY"
      };
    }

    if (throughputKbps < 600) {
      return {
        recommendedChunkSizeBytes: clampChunkSize(1 * 1024 * 1024),
        reason: "SLOW_NETWORK"
      };
    }

    if (throughputKbps < 2500) {
      return {
        recommendedChunkSizeBytes: clampChunkSize(5 * 1024 * 1024),
        reason: "MEDIUM_NETWORK"
      };
    }

    return {
      recommendedChunkSizeBytes: clampChunkSize(10 * 1024 * 1024),
      reason: "FAST_NETWORK"
    };
  }
};
