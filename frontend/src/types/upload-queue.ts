export const uploadQueueItemStatuses = [
  "queued",
  "uploading",
  "paused",
  "offline",
  "processing",
  "ready",
  "failed",
  "cancelled"
] as const;

export type UploadQueueItemStatus = (typeof uploadQueueItemStatuses)[number];

export type UploadQueueItem = {
  localId: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  status: UploadQueueItemStatus;
  progressPercent: number;
  bytesUploaded: number;
  chunkSizeBytes: number;
  nextChunkIndex: number;
  retryAttempt: number;
  sessionId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UploadQueueState = {
  items: UploadQueueItem[];
  online: boolean;
  activeCount: number;
  maxConcurrency: number;
};
