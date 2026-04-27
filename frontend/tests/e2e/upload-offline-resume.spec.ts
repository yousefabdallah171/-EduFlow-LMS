import { expect, test } from "@playwright/test";

const queueItem = {
  localId: "offline-item-1",
  fileName: "lesson-15.mp4",
  fileSizeBytes: 2_000_000,
  mimeType: "video/mp4",
  status: "uploading",
  progressPercent: 25,
  bytesUploaded: 500_000,
  chunkSizeBytes: 1_048_576,
  nextChunkIndex: 1,
  retryAttempt: 0,
  sessionId: "session-offline-1",
  errorCode: null,
  errorMessage: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

test("marks uploads offline and auto-resumes when connectivity returns", async ({ page }) => {
  await page.goto("/");

  const transitions = await page.evaluate(async (item) => {
    const { indexedDbUploadState } = await import("/src/lib/indexeddb-upload-state.ts");
    const { useUploadQueueStore } = await import("/src/stores/upload-queue.store.ts");

    await indexedDbUploadState.clearAll();
    useUploadQueueStore.getState().enqueue([item as any]);
    await new Promise((resolve) => window.setTimeout(resolve, 100));

    useUploadQueueStore.getState().setOnline(false);
    const offlineStatus = useUploadQueueStore.getState().items[0]?.status;

    useUploadQueueStore.getState().setOnline(true);
    const resumedStatus = useUploadQueueStore.getState().items[0]?.status;

    const persistedItems = await indexedDbUploadState.getAllItems();
    await indexedDbUploadState.clearAll();

    return {
      offlineStatus,
      resumedStatus,
      persistedStatus: persistedItems[0]?.status ?? null
    };
  }, queueItem);

  expect(transitions.offlineStatus).toBe("offline");
  expect(transitions.resumedStatus).toBe("queued");
  expect(transitions.persistedStatus).toBe("queued");
});
