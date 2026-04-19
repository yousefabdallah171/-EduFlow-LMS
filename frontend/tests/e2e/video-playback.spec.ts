import { expect, test } from "@playwright/test";

test("video playback shows watermark for the enrolled student", async ({ page }) => {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

  await page.route("**/api/v1/auth/refresh", async (route) => {
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

  await page.route("**/api/v1/auth/login", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
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

  await page.route("**/api/v1/lessons", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        lessons: [
          {
            id: "lesson-1",
            title: "Protected Lesson",
            durationSeconds: 120,
            sortOrder: 1,
            isUnlocked: true,
            unlocksAt: null,
            completedAt: null,
            lastPositionSeconds: 18
          }
        ]
      })
    });
  });

  await page.route("**/api/v1/lessons/grouped", async (route) => {
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
                titleEn: "Protected Lesson",
                titleAr: "Protected Lesson",
                durationSeconds: 120,
                sortOrder: 1,
                isUnlocked: true,
                unlocksAt: null,
                completedAt: null,
                lastPositionSeconds: 18
              }
            ]
          }
        ]
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

  await page.route("**/api/v1/lessons/lesson-1", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "lesson-1",
        title: "Protected Lesson",
        descriptionHtml: "Keep this content private.",
        durationSeconds: 120,
        videoToken: "video-token",
        hlsUrl: "/api/v1/video/lesson-1/playlist.m3u8?token=video-token",
        watermark: {
          name: "Student One",
          maskedEmail: "s***@example.com"
        },
        progress: {
          lastPositionSeconds: 18,
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

  await page.route("**/api/v1/lessons/lesson-1/progress", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        lastPositionSeconds: 18,
        watchTimeSeconds: 18,
        completedAt: null,
        courseCompletionPercentage: 0
      })
    });
  });

  await page.goto(`${baseUrl}/login`);
  await page.getByLabel("Email").fill("student@example.com");
  await page.getByLabel("Password").fill("Securepass123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(`${baseUrl}/dashboard`);

  await page.evaluate(() => {
    window.history.pushState({}, "", "/en/lessons/lesson-1");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });

  await expect(page.getByRole("heading", { name: "Protected Lesson", level: 1 })).toBeVisible();
  await expect(page.getByTestId("watermark-overlay")).toContainText("Student One");
  await expect(page.getByTestId("watermark-overlay")).toContainText("s***@example.com");
});
