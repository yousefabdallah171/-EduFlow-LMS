import { expect, test } from "@playwright/test";

test("admin filters orders by seller and date range", async ({ page }) => {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

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

  await page.route("**/api/v1/admin/orders", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        payments: [
          {
            id: "order-1",
            amountPiasters: 100000,
            status: "COMPLETED",
            createdAt: "2026-04-12T09:00:00.000Z",
            user: { fullName: "JABEDUL", email: "jabedul@example.com" }
          },
          {
            id: "order-2",
            amountPiasters: 120000,
            status: "PENDING",
            createdAt: "2026-04-25T09:00:00.000Z",
            user: { fullName: "Yousef Abdallah", email: "yousef@example.com" }
          }
        ],
        total: 2
      })
    });
  });

  await page.route("**/api/v1/admin/orders/export-csv", async (route) => {
    await route.fulfill({
      status: 200,
      headers: { "content-type": "text/csv" },
      body: "id,amount,status\norder-1,1000,COMPLETED\n"
    });
  });

  await page.goto("/en/login");
  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Password").fill("Securepass123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.context().addCookies([{ name: "eduflow_refresh_present", value: "1", url: baseUrl, sameSite: "Strict" }]);
  await expect(page).toHaveURL(/\/en\/admin\/dashboard$/);

  await page.goto("/en/admin/orders");
  await expect(page.getByRole("heading", { name: "Orders", exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("h3", { hasText: "JABEDUL" })).toBeVisible();
  await expect(page.locator("h3", { hasText: "Yousef Abdallah" })).toBeVisible();

  await page.getByPlaceholder("JABEDUL").fill("JABEDUL");
  await expect(page.locator("h3", { hasText: "JABEDUL" })).toBeVisible();
  await expect(page.locator("h3", { hasText: "Yousef Abdallah" })).toHaveCount(0);

  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page.locator("h3", { hasText: "JABEDUL" })).toBeVisible();
  await expect(page.locator("h3", { hasText: "Yousef Abdallah" })).toBeVisible();

  await page.locator('input[aria-label="From"]').fill("2026-04-20");
  await expect(page.locator("h3", { hasText: "Yousef Abdallah" })).toBeVisible();
  await expect(page.locator("h3", { hasText: "JABEDUL" })).toHaveCount(0);

  await page.locator('input[aria-label="To"]').fill("2026-04-22");
  await expect(page.locator("h3", { hasText: "Yousef Abdallah" })).toHaveCount(0);
});
