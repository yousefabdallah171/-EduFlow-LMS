import { expect, test } from "@playwright/test";

test("admin runs bulk mapper review and submits bulk attachment", async ({ page }) => {
  let autoMapCalled = 0;
  let bulkAttachCalled = 0;

  await page.route("**/api/v1/auth/login", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: {
        "set-cookie": "eduflow_refresh_present=1; Path=/; SameSite=Strict"
      },
      body: JSON.stringify({
        accessToken: "admin-access-token",
        user: {
          id: "admin-1",
          email: "admin@example.com",
          fullName: "Admin User",
          role: "ADMIN",
          locale: "en",
          theme: "light",
          avatarUrl: null
        }
      })
    });
  });

  await page.route("**/api/v1/auth/refresh", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        accessToken: "admin-access-token",
        user: {
          id: "admin-1",
          email: "admin@example.com",
          fullName: "Admin User",
          role: "ADMIN",
          locale: "en",
          theme: "light",
          avatarUrl: null
        }
      })
    });
  });

  await page.route("**/api/v1/admin/lessons**", async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        lessons: [
          {
            id: "lesson-1",
            titleEn: "Lesson 01",
            titleAr: "Lesson 01",
            sortOrder: 1,
            isPublished: true,
            videoStatus: "READY",
            durationSeconds: 420,
            dripDays: null,
            sectionId: null,
            section: null
          }
        ]
      })
    });
  });

  await page.route("**/api/v1/admin/sections", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ sections: [] })
    });
  });

  await page.route("**/api/v1/admin/media-library**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [
          {
            id: "media-1",
            title: "Lesson 01 Video",
            originalFilename: "lesson-01.mp4",
            status: "READY",
            sizeBytes: 1024
          }
        ],
        pagination: { page: 1, pageSize: 200, total: 1 }
      })
    });
  });

  await page.route("**/api/v1/admin/lessons/media/auto-map", async (route) => {
    autoMapCalled += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        matches: [
          {
            lessonId: "lesson-1",
            mediaAssetId: "media-1",
            confidence: 0.93,
            reason: "normalized-name-exact"
          }
        ],
        unmatchedLessonIds: [],
        unmatchedMediaAssetIds: []
      })
    });
  });

  await page.route("**/api/v1/admin/lessons/media/bulk-attach", async (route) => {
    bulkAttachCalled += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        batchReportId: "batch-1",
        applied: 1,
        skipped: 0,
        failed: 0
      })
    });
  });

  await page.goto("/en/login");
  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Password").fill("Securepass123");
  await page.getByRole("button", { name: "Sign in" }).click();

  await page.goto("/en/admin/lessons");
  await expect(page.getByText("Bulk Lesson Mapper")).toBeVisible({ timeout: 15000 });

  await page.getByRole("button", { name: "Run Auto-Map" }).click();
  await expect.poll(() => autoMapCalled).toBeGreaterThan(0);
  await expect(page.getByText("lesson-1 ← media-1")).toBeVisible();

  await page.getByRole("button", { name: "Apply Bulk Attach" }).click();
  await expect.poll(() => bulkAttachCalled).toBeGreaterThan(0);
});
