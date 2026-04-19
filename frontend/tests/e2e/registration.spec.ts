import { expect, test } from "@playwright/test";

test("student registration and login flow", async ({ page }) => {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

  await page.route("**/api/v1/auth/register", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        message: "Registration successful. You can now log in.",
        user: {
          id: "student-1",
          email: "student@example.com",
          fullName: "Student One"
        }
      })
    });
  });

  await page.route("**/api/v1/auth/login", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: {
        "set-cookie": "eduflow_refresh_present=1; Path=/; SameSite=Strict"
      },
      body: JSON.stringify({
        accessToken: "access-token",
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

  await page.route("**/api/v1/student/dashboard", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        lastLessonId: null,
        completionPercent: 0,
        enrolled: false,
        status: null,
        enrolledAt: null
      })
    });
  });

  await page.goto(`${baseUrl}/register`);
  await page.getByLabel("Full name").fill("Student One");
  await page.getByLabel("Email").fill("student@example.com");
  await page.getByLabel("Password").fill("Securepass123");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByText("Registration successful. You can now log in.")).toBeVisible();
  await page.getByRole("link", { name: "Go to login" }).click();
  await page.getByLabel("Email").fill("student@example.com");
  await page.getByLabel("Password").fill("Securepass123");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});
