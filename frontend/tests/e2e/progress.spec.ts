import { expect, test } from "@playwright/test";

test("student progress updates mark the lesson as completed", async ({ page }) => {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";
  let progressSaved = false;

  await page.route("**/api/v1/auth/login", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: {
        "set-cookie": "eduflow_refresh_present=1; Path=/; SameSite=Strict"
      },
      body: JSON.stringify({
        accessToken: "student-access-token",
        user: {
          id: "student-1",
          email: "student@example.com",
          fullName: "Student One",
          role: "STUDENT",
          locale: "en",
          theme: "light",
          avatarUrl: null
        }
      })
    });
  });

  await page.route("**/api/v1/enrollment", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        enrolled: true,
        status: "ACTIVE",
        enrollmentType: "PAID"
      })
    });
  });

  await page.route(/\/api\/v1\/lessons$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        lessons: [
          {
            id: "lesson-1",
            title: "Progress Lesson",
            durationSeconds: 100,
            sortOrder: 1,
            isUnlocked: true,
            unlocksAt: null,
            completedAt: progressSaved ? "2026-04-12T12:00:00.000Z" : null,
            lastPositionSeconds: progressSaved ? 95 : 0
          }
        ]
      })
    });
  });

  await page.route(/\/api\/v1\/lessons\/grouped$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        sections: [
          {
            id: "section-1",
            titleEn: "Foundations",
            titleAr: "Foundations",
            sortOrder: 1,
            lessons: [
              {
                id: "lesson-1",
                titleEn: "Progress Lesson",
                titleAr: "Progress Lesson",
                durationSeconds: 100,
                sortOrder: 1,
                isUnlocked: true,
                unlocksAt: null,
                completedAt: progressSaved ? "2026-04-12T12:00:00.000Z" : null,
                lastPositionSeconds: progressSaved ? 95 : 0
              }
            ]
          }
        ]
      })
    });
  });

  await page.route(/\/api\/v1\/lessons\/lesson-1$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "lesson-1",
        title: "Progress Lesson",
        descriptionHtml: "Track completion.",
        durationSeconds: 100,
        videoToken: "video-token",
        hlsUrl: "/api/v1/video/lesson-1/playlist.m3u8?token=video-token",
        watermark: {
          name: "Student One",
          maskedEmail: "s***@example.com"
        },
        progress: {
          lastPositionSeconds: 0,
          completedAt: null
        }
      })
    });
  });

  await page.route("**/api/v1/video/lesson-1/playlist.m3u8?token=video-token", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/vnd.apple.mpegurl",
      body: "#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-ENDLIST\n"
    });
  });

  await page.route(/\/api\/v1\/lessons\/lesson-1\/progress$/, async (route) => {
    progressSaved = true;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        lastPositionSeconds: 95,
        watchTimeSeconds: 95,
        completedAt: "2026-04-12T12:00:00.000Z",
        courseCompletionPercentage: 100
      })
    });
  });

  await page.goto(`${baseUrl}/login`);
  await page.getByLabel("Email").fill("student@example.com");
  await page.getByLabel("Password").fill("Securepass123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.context().addCookies([{ name: "eduflow_refresh_present", value: "1", url: baseUrl, sameSite: "Strict" }]);
  await expect(page).toHaveURL(`${baseUrl}/dashboard`);
  await page.evaluate(() => {
    window.history.pushState({}, "", "/lessons/lesson-1");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(page.getByRole("heading", { name: "Progress Lesson", level: 1 })).toBeVisible();

  await page.locator("video").evaluate((video) => {
    Object.defineProperty(video, "duration", { configurable: true, value: 100 });
    Object.defineProperty(video, "currentTime", { configurable: true, writable: true, value: 95 });
    video.dispatchEvent(new Event("timeupdate"));
  });

  await page.evaluate(() => {
    window.history.pushState({}, "", "/course");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(page.getByText("100%")).toBeVisible();
  await expect(page.getByText(/Completed - 1:40/)).toBeVisible();
});
