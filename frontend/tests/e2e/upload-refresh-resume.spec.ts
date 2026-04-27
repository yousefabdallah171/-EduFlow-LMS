import { expect, test } from "@playwright/test";

const seedQueueItem = {
  localId: "queue-item-1",
  fileName: "lesson-12.mp4",
  fileSizeBytes: 1_500_000,
  mimeType: "video/mp4",
  status: "uploading",
  progressPercent: 43,
  bytesUploaded: 645_000,
  chunkSizeBytes: 1_048_576,
  nextChunkIndex: 2,
  retryAttempt: 0,
  sessionId: "session-12",
  errorCode: null,
  errorMessage: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

test("restores persisted upload queue after refresh and reopen", async ({ page }) => {
  await page.goto("/");

  await page.evaluate(async (item) => {
    const { indexedDbUploadState } = await import("/src/lib/indexeddb-upload-state.ts");
    const { useUploadQueueStore } = await import("/src/stores/upload-queue.store.ts");

    await indexedDbUploadState.clearAll();
    useUploadQueueStore.getState().enqueue([item as any]);
    await new Promise((resolve) => window.setTimeout(resolve, 100));
  }, seedQueueItem);

  await page.reload();

  const refreshedCount = await page.evaluate(async () => {
    const { useUploadQueueStore } = await import("/src/stores/upload-queue.store.ts");
    await useUploadQueueStore.getState().initialize();
    return useUploadQueueStore.getState().items.length;
  });

  expect(refreshedCount).toBe(1);

  const context = page.context();
  const reopenedPage = await context.newPage();
  await reopenedPage.goto("/");

  const reopenedItem = await reopenedPage.evaluate(async () => {
    const { useUploadQueueStore } = await import("/src/stores/upload-queue.store.ts");
    await useUploadQueueStore.getState().initialize();
    return useUploadQueueStore.getState().items[0];
  });

  expect(reopenedItem.fileName).toBe("lesson-12.mp4");
  expect(reopenedItem.status).toBe("queued");
  expect(reopenedItem.progressPercent).toBe(43);

  await reopenedPage.evaluate(async () => {
    const { indexedDbUploadState } = await import("/src/lib/indexeddb-upload-state.ts");
    await indexedDbUploadState.clearAll();
  });
  await reopenedPage.close();
});
