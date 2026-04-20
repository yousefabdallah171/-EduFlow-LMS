import { expect, test } from "@playwright/test";

test("admin enrolls and revokes a student from student management", async ({ page }) => {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";
  let enrollmentStatus: "ACTIVE" | "REVOKED" | "NONE" = "NONE";

  const student = {
    id: "student-1",
    email: "manual-student@example.com",
    fullName: "Manual Student",
    avatarUrl: null,
    enrollmentType: null,
    enrolledAt: null,
    courseCompletion: 0,
    lastActiveAt: null
  };

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
        accessToken: "admin-refresh-token",
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

  await page.route(/\/api\/v1\/admin\/students\/search(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        results: [
          {
            id: student.id,
            email: student.email,
            fullName: student.fullName,
            enrollmentStatus
          }
        ]
      })
    });
  });

  await page.route(/\/api\/v1\/admin\/students(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: [
          {
            ...student,
            enrollmentStatus,
            enrollmentType: enrollmentStatus === "ACTIVE" ? "ADMIN_ENROLLED" : null,
            enrolledAt: enrollmentStatus === "ACTIVE" ? "2026-04-12T12:00:00.000Z" : null
          }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1
        }
      })
    });
  });

  await page.route("**/api/v1/admin/students/student-1/enroll", async (route) => {
    enrollmentStatus = "ACTIVE";
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        enrollment: {
          id: "enrollment-1",
          userId: student.id,
          status: "ACTIVE",
          enrollmentType: "ADMIN_ENROLLED",
          enrolledAt: "2026-04-12T12:00:00.000Z"
        },
        message: "Student enrolled successfully."
      })
    });
  });

  await page.route("**/api/v1/admin/students/student-1/revoke", async (route) => {
    enrollmentStatus = "REVOKED";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        enrollment: {
          id: "enrollment-1",
          userId: student.id,
          status: "REVOKED",
          enrollmentType: "ADMIN_ENROLLED",
          revokedAt: "2026-04-12T12:05:00.000Z"
        },
        message: "Student access revoked."
      })
    });
  });

  await page.goto(`${baseUrl}/login`);
  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Password").fill("Securepass123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(`${baseUrl}/admin/dashboard`);

  await page.goto(`${baseUrl}/admin/students`);
  await expect(page.getByRole("heading", { name: "Student management" })).toBeVisible();
  await expect(page.getByText("Manual Student")).toBeVisible();
  await expect(page.getByText("None", { exact: true }).first()).toBeVisible();

  await page.getByLabel("Search students").fill("manual");
  await page.getByRole("option", { name: /Manual Student/ }).click();
  await page.getByRole("button", { name: "Enroll" }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Enroll" }).click();

  await expect(page.getByText("ADMIN_ENROLLED")).toBeVisible();
  await expect(page.getByText("Active", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Revoke access" }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Revoke access" }).click();

  await expect(page.getByText("Revoked", { exact: true })).toBeVisible();
});
