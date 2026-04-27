import { expect, test } from "@playwright/test";

test.skip("admin uses recovery dashboard to retry failed uploads and see batch summary", async ({ page }) => {
  let retryCalled = 0;

  await page.route("**/api/v1/admin/media-library/status-summary**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        uploading: 2,
        processing: 3,
        ready: 10,
        failed: 4,
        total: 19
      })
    });
  });

  await page.route("**/api/v1/admin/media-library/telemetry**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        queueDepth: 6,
        processingRatePerMinute: 1.5,
        failedPerHour: 3,
        stuckItems: 2,
        stuckSessionIds: ["stuck-1", "stuck-2"]
      })
    });
  });

  await page.route("**/api/v1/admin/uploads/retry-failed", async (route) => {
    retryCalled += 1;
    await route.fulfill({
      status: 202,
      contentType: "application/json",
      body: JSON.stringify({
        batchReportId: "batch-retry-1",
        scheduledItems: 3
      })
    });
  });

  await page.route("**/api/v1/admin/uploads/batch-summary", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        reports: [
          {
            id: "batch-retry-1",
            operationType: "RETRY_FAILED",
            totalItems: 4,
            completedItems: 3,
            failedItems: 1,
            retriedItems: 3,
            startedAt: new Date().toISOString(),
            finishedAt: new Date().toISOString()
          }
        ]
      })
    });
  });

  await page.route("**/api/v1/admin/media-library**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [],
        pagination: { page: 1, pageSize: 30, total: 0 }
      })
    });
  });

  await page.goto("/en");
  await page.evaluate(async () => {
    const { useAuthStore } = await import("/src/stores/auth.store.ts");
    useAuthStore.getState().setSession("admin-access-token", {
      id: "admin-1",
      email: "admin@example.com",
      fullName: "Admin User",
      role: "ADMIN",
      locale: "en",
      theme: "light",
      avatarUrl: null
    });
    useAuthStore.getState().markAuthReady();
  });

  await page.goto("/en/admin/media");

  await expect(page.getByText("Upload Recovery Panel")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/Stuck Items:\s*2/)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Batch Summary")).toBeVisible();

  await page.getByRole("button", { name: "Retry All Failed" }).click();
  await expect.poll(() => retryCalled).toBeGreaterThan(0);
});
