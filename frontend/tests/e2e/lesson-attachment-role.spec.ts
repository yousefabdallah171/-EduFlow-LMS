import { expect, test } from "@playwright/test";

test("lesson attachment drawer enforces role-aware media selection and payload", async ({ page }) => {
  let lastMediaLibraryQuery = "";
  let lastAttachPayload: Record<string, unknown> | null = null;

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

  await page.route("**/api/v1/admin/sections", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ sections: [] })
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

  await page.route("**/api/v1/admin/lessons/lesson-1/media**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ lessonId: "lesson-1", attachments: [] })
      });
      return;
    }

    lastAttachPayload = (route.request().postDataJSON() as Record<string, unknown>) ?? null;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        lessonId: "lesson-1",
        mediaAssetId: "video-1",
        role: "PRIMARY_VIDEO",
        status: "ATTACHED"
      })
    });
  });

  await page.route("**/api/v1/admin/media-library**", async (route) => {
    lastMediaLibraryQuery = route.request().url();
    const url = new URL(route.request().url());
    const type = url.searchParams.get("type");
    const items =
      type === "VIDEO"
        ? [{ id: "video-1", title: "Lesson Video", originalFilename: "lesson.mp4", status: "READY", type: "VIDEO" }]
        : [
            { id: "video-1", title: "Lesson Video", originalFilename: "lesson.mp4", status: "READY", type: "VIDEO" },
            { id: "pdf-1", title: "Lesson PDF", originalFilename: "lesson.pdf", status: "READY", type: "PDF" }
          ];

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items, pagination: { page: 1, pageSize: 200, total: items.length } })
    });
  });

  await page.goto("/en/login");
  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Password").fill("Securepass123");
  await page.getByRole("button", { name: "Sign in" }).click();

  await page.goto("/en/admin/lessons");
  await page.getByRole("button", { name: "Open Lesson Attachment Drawer" }).click();

  await expect(page.locator("option", { hasText: "Lesson PDF (PDF)" })).toHaveCount(1);

  await page.getByLabel("Attachment Role").selectOption("PRIMARY_VIDEO");
  await expect.poll(() => lastMediaLibraryQuery.includes("type=VIDEO")).toBeTruthy();
  await expect(page.locator("option", { hasText: "Lesson PDF (PDF)" })).toHaveCount(0);

  await page.getByLabel("Media Asset").selectOption("video-1");
  await page.getByRole("button", { name: "Attach Media" }).click();
  await expect.poll(() => lastAttachPayload?.role).toBe("PRIMARY_VIDEO");
});
