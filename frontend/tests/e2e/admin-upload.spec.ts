import { expect, test } from "@playwright/test";

test("admin starts a resumable upload and sees progress feedback", async ({ page }) => {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";
  let uploadCreated = 0;
  let uploadPatched = 0;

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

  await page.route("**/api/v1/admin/lessons", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        lessons: [
          {
            id: "lesson-1",
            titleEn: "Upload Lesson",
            titleAr: "درس الرفع",
            sortOrder: 1,
            isPublished: false,
            videoStatus: "NONE",
            durationSeconds: null,
            dripDays: null
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

  await page.route("**/api/v1/admin/lessons/lesson-1/resources", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ resources: [] })
    });
  });

  await page.route("**/api/v1/admin/uploads", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          uploads: []
        })
      });
      return;
    }

    uploadCreated += 1;

    await route.fulfill({
      status: 201,
      headers: {
        Location: "/api/v1/admin/uploads/upload-1",
        "Tus-Resumable": "1.0.0"
      },
      body: ""
    });
  });

  await page.route("**/api/v1/admin/uploads/upload-1", async (route) => {
    uploadPatched += 1;
    const totalBytes = route.request().postDataBuffer()?.byteLength ?? 1024;
    await route.fulfill({
      status: 204,
      headers: {
        "Tus-Resumable": "1.0.0",
        "Upload-Offset": String(totalBytes)
      },
      body: ""
    });
  });

  await page.goto("/en/login");
  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Password").fill("Securepass123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.context().addCookies([{ name: "eduflow_refresh_present", value: "1", url: baseUrl, sameSite: "Strict" }]);
  await expect(page).toHaveURL(/\/en\/admin\/dashboard$/);
  await page.goto("/en/admin/lessons");

  await expect(page.getByRole("heading", { name: "Lesson uploads" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Selected lesson")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Replace or add the lesson video" })).toBeVisible();
  await page.setInputFiles('input[type="file"]', {
    name: "lesson.mp4",
    mimeType: "video/mp4",
    buffer: Buffer.from("demo video content")
  });

  await expect.poll(() => uploadCreated).toBeGreaterThan(0);
  await expect.poll(() => uploadPatched).toBeGreaterThan(0);
  await expect(page.getByRole("heading", { name: "Resources and links" })).toBeVisible();
});
