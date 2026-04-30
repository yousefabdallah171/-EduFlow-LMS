export const uploadSessionStatuses = [
  "QUEUED",
  "UPLOADING",
  "PAUSED",
  "OFFLINE",
  "PROCESSING",
  "READY",
  "FAILED",
  "CANCELLED"
] as const;

export type UploadSessionStatus = (typeof uploadSessionStatuses)[number];

export const uploadProtocols = ["TUS", "MULTIPART"] as const;
export type UploadProtocol = (typeof uploadProtocols)[number];

export type UploadSessionState = {
  sessionId: string;
  status: UploadSessionStatus;
  chunkSizeBytes: number;
  nextChunkIndex: number;
  maxChunkIndex: number;
  retryAttempt: number;
  retryNextAt: string | null;
  uploadedBytes: number;
  fileSizeBytes: number;
};

export type ChunkAcknowledgement = {
  sessionId: string;
  acknowledgedChunkIndex: number;
  nextChunkIndex: number;
  recommendedChunkSizeBytes: number;
  retryAdvice: {
    shouldBackoff: boolean;
    nextDelayMs: number;
  };
};
