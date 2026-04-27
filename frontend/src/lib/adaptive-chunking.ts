import { uploadConfig } from "@/lib/upload-config";

type AdaptiveChunkInput = {
  currentChunkSizeBytes: number;
  rollingSpeedBytesPerSecond: number;
  retryAttempt: number;
  serverHintChunkSizeBytes?: number;
};

const clampChunkSize = (sizeBytes: number) =>
  Math.min(Math.max(Math.floor(sizeBytes), uploadConfig.minChunkSizeBytes), uploadConfig.maxChunkSizeBytes);

export const adaptiveChunking = {
  nextChunkSize(input: AdaptiveChunkInput) {
    if (input.serverHintChunkSizeBytes && Number.isFinite(input.serverHintChunkSizeBytes)) {
      return clampChunkSize(input.serverHintChunkSizeBytes);
    }

    if (input.retryAttempt > 0) {
      return clampChunkSize(input.currentChunkSizeBytes * 0.6);
    }

    const speedMbps = (input.rollingSpeedBytesPerSecond * 8) / (1024 * 1024);
    if (!Number.isFinite(speedMbps) || speedMbps <= 0) {
      return clampChunkSize(input.currentChunkSizeBytes);
    }

    if (speedMbps < 0.8) {
      return clampChunkSize(1 * 1024 * 1024);
    }

    if (speedMbps < 8) {
      return clampChunkSize(5 * 1024 * 1024);
    }

    return clampChunkSize(10 * 1024 * 1024);
  }
};
