import { useCallback, useEffect, useMemo, useRef } from "react";

import { api } from "@/lib/api";
import { adaptiveChunking } from "@/lib/adaptive-chunking";
import { uploadConfig } from "@/lib/upload-config";
import { UploadTelemetryTracker } from "@/lib/upload-eta";
import { useUploadQueueStore } from "@/stores/upload-queue.store";
import type { UploadQueueItem } from "@/types/upload-queue";

type UploadSessionResponse = {
  sessionId: string;
  uploadUrl: string;
  protocol: string;
  initialChunkSizeBytes: number;
  resumeFromChunkIndex: number;
  status: string;
};

type ChunkAckResponse = {
  sessionId: string;
  acknowledgedChunkIndex: number;
  nextChunkIndex: number;
  recommendedChunkSizeBytes: number;
  retryAdvice?: {
    shouldBackoff: boolean;
    nextDelayMs: number;
  };
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const checksumSha256 = async (buffer: ArrayBuffer) => {
  const digest = await window.crypto.subtle.digest("SHA-256", buffer);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const buildQueueItem = (file: File): UploadQueueItem => {
  const now = new Date().toISOString();
  return {
    localId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    fileName: file.name,
    fileSizeBytes: file.size,
    mimeType: file.type || "application/octet-stream",
    status: "queued",
    progressPercent: 0,
    bytesUploaded: 0,
    chunkSizeBytes: uploadConfig.defaultChunkSizeBytes,
    nextChunkIndex: 0,
    retryAttempt: 0,
    sessionId: null,
    errorCode: null,
    errorMessage: null,
    createdAt: now,
    updatedAt: now
  };
};

export const useUploadQueue = () => {
  const {
    items,
    online,
    maxConcurrency,
    activeCount,
    initialize,
    enqueue,
    updateItem,
    setOnline,
    setActiveCount,
    retryItem,
    retryAllFailed
  } = useUploadQueueStore();

  const fileMapRef = useRef<Map<string, File>>(new Map());
  const inFlightIdsRef = useRef<Set<string>>(new Set());
  const telemetryRef = useRef<Map<string, UploadTelemetryTracker>>(new Map());

  const enqueueFiles = useCallback(
    (files: File[]) => {
      const nextItems = files.map((file) => {
        const item = buildQueueItem(file);
        fileMapRef.current.set(item.localId, file);
        telemetryRef.current.set(item.localId, new UploadTelemetryTracker(file.size));
        return item;
      });
      enqueue(nextItems);
    },
    [enqueue]
  );

  const pause = useCallback(
    (localId: string) => {
      updateItem(localId, { status: "paused" });
    },
    [updateItem]
  );

  const resume = useCallback(
    (localId: string) => {
      updateItem(localId, { status: "queued", errorCode: null, errorMessage: null });
    },
    [updateItem]
  );

  const retry = useCallback(
    (localId: string) => {
      retryItem(localId);
    },
    [retryItem]
  );

  const retryAll = useCallback(async () => {
    try {
      await api.post("/admin/uploads/retry-failed", {
        scope: "CURRENT_FILTER",
        filter: { status: "FAILED" }
      });
    } catch {
      // Local queue retry still proceeds if remote scheduling endpoint fails.
    }
    retryAllFailed();
  }, [retryAllFailed]);

  const runItemUpload = useCallback(
    async (queueItem: UploadQueueItem) => {
      inFlightIdsRef.current.add(queueItem.localId);
      setActiveCount(inFlightIdsRef.current.size);

      try {
        const file = fileMapRef.current.get(queueItem.localId);
        if (!file) {
          updateItem(queueItem.localId, {
            status: "failed",
            errorCode: "FILE_NOT_FOUND",
            errorMessage: "Source file is not available in the current tab."
          });
          return;
        }

        updateItem(queueItem.localId, { status: "uploading" });

        let latest = useUploadQueueStore.getState().items.find((item) => item.localId === queueItem.localId);
        if (!latest) {
          return;
        }

        if (!latest.sessionId) {
          const sessionResponse = await api.post<UploadSessionResponse>("/admin/uploads/sessions", {
            fileName: latest.fileName,
            fileSizeBytes: latest.fileSizeBytes,
            mimeType: latest.mimeType
          });

          updateItem(latest.localId, {
            sessionId: sessionResponse.data.sessionId,
            chunkSizeBytes: sessionResponse.data.initialChunkSizeBytes,
            nextChunkIndex: sessionResponse.data.resumeFromChunkIndex
          });
        }

        latest = useUploadQueueStore.getState().items.find((item) => item.localId === queueItem.localId);
        if (!latest?.sessionId) {
          throw new Error("UPLOAD_SESSION_NOT_FOUND");
        }

        const telemetry = telemetryRef.current.get(queueItem.localId) ?? new UploadTelemetryTracker(file.size);
        telemetryRef.current.set(queueItem.localId, telemetry);

        let uploadedBytes = latest.bytesUploaded;
        while (uploadedBytes < file.size) {
          const current = useUploadQueueStore.getState().items.find((item) => item.localId === queueItem.localId);
          if (!current) {
            return;
          }

          if (current.status === "paused" || current.status === "cancelled" || current.status === "offline") {
            return;
          }

          const chunkSize = Math.max(current.chunkSizeBytes, uploadConfig.minChunkSizeBytes);
          const chunkBlob = file.slice(uploadedBytes, uploadedBytes + chunkSize);
          const chunkBuffer = await chunkBlob.arrayBuffer();
          const chunkChecksum = await checksumSha256(chunkBuffer);
          const chunkStartMs = Date.now();

          const ack = await api.patch<ChunkAckResponse>(
            `/admin/uploads/sessions/${current.sessionId}/chunks`,
            chunkBuffer,
            {
              headers: {
                "Content-Type": "application/offset+octet-stream",
                "Upload-Chunk-Index": String(current.nextChunkIndex),
                "Upload-Chunk-Checksum": chunkChecksum
              }
            }
          );

          uploadedBytes += chunkBlob.size;
          const elapsedMs = Date.now() - chunkStartMs;
          const telemetrySnapshot = telemetry.track(uploadedBytes);
          const nextChunkSize = adaptiveChunking.nextChunkSize({
            currentChunkSizeBytes: chunkBlob.size,
            rollingSpeedBytesPerSecond: telemetrySnapshot.instantaneousSpeedBytesPerSecond,
            retryAttempt: current.retryAttempt,
            serverHintChunkSizeBytes: ack.data.recommendedChunkSizeBytes
          });

          updateItem(current.localId, {
            status: uploadedBytes >= file.size ? "processing" : "uploading",
            bytesUploaded: uploadedBytes,
            progressPercent: Math.min(100, Math.round((uploadedBytes / file.size) * 100)),
            nextChunkIndex: ack.data.nextChunkIndex,
            chunkSizeBytes: nextChunkSize,
            retryAttempt: 0,
            errorCode: null,
            errorMessage: null
          });

          if (ack.data.retryAdvice?.shouldBackoff && ack.data.retryAdvice.nextDelayMs > 0) {
            await sleep(ack.data.retryAdvice.nextDelayMs);
          } else if (elapsedMs > 0 && elapsedMs < 25) {
            await sleep(25);
          }
        }

        const current = useUploadQueueStore.getState().items.find((item) => item.localId === queueItem.localId);
        if (!current?.sessionId) {
          throw new Error("UPLOAD_SESSION_NOT_FOUND");
        }

        await api.post(`/admin/uploads/sessions/${current.sessionId}/complete`);
        updateItem(current.localId, {
          status: "ready",
          progressPercent: 100
        });
      } catch (error) {
        const current = useUploadQueueStore.getState().items.find((item) => item.localId === queueItem.localId);
        if (!current) {
          return;
        }

        const nextAttempt = current.retryAttempt + 1;
        if (nextAttempt > uploadConfig.maxRetryAttempts) {
          updateItem(current.localId, {
            status: "failed",
            retryAttempt: nextAttempt,
            errorCode: "UPLOAD_MAX_RETRY_EXCEEDED",
            errorMessage: error instanceof Error ? error.message : "Upload failed."
          });
          return;
        }

        const backoffDelayMs = Math.min(
          uploadConfig.retryInitialDelaySeconds * 1000 * Math.pow(2, current.retryAttempt),
          uploadConfig.retryMaxDelaySeconds * 1000
        );

        updateItem(current.localId, {
          status: online ? "queued" : "offline",
          retryAttempt: nextAttempt,
          errorCode: "UPLOAD_RETRY_SCHEDULED",
          errorMessage: error instanceof Error ? error.message : "Retry scheduled."
        });

        await sleep(backoffDelayMs);
      } finally {
        inFlightIdsRef.current.delete(queueItem.localId);
        setActiveCount(inFlightIdsRef.current.size);
      }
    },
    [online, setActiveCount, updateItem]
  );

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setOnline]);

  useEffect(() => {
    if (!online) {
      return;
    }

    const availableSlots = Math.max(maxConcurrency - inFlightIdsRef.current.size, 0);
    if (availableSlots <= 0) {
      return;
    }

    const queueCandidates = items.filter(
      (item) => item.status === "queued" && !inFlightIdsRef.current.has(item.localId)
    );

    for (const item of queueCandidates.slice(0, availableSlots)) {
      void runItemUpload(item);
    }
  }, [items, maxConcurrency, online, runItemUpload]);

  const queueSummary = useMemo(() => {
    const total = items.length;
    const failed = items.filter((item) => item.status === "failed").length;
    const uploading = items.filter((item) => item.status === "uploading").length;
    const completed = items.filter((item) => item.status === "ready").length;
    const overallProgress =
      total === 0
        ? 0
        : Math.round(items.reduce((sum, item) => sum + item.progressPercent, 0) / total);

    return {
      total,
      failed,
      uploading,
      completed,
      overallProgress
    };
  }, [items]);

  return {
    items,
    online,
    activeCount,
    queueSummary,
    enqueueFiles,
    pause,
    resume,
    retry,
    retryAll
  };
};
