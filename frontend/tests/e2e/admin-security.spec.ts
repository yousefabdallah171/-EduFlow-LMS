import { expect, test } from "@playwright/test";

test("admin security pages", async ({ page }) => {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

  await page.route("**/api/v1/auth/refresh", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        accessToken: "admin-token",
        user: {
          id: "admin-1",
          email: "admin@example.com",
          fullName: "Admin",
          role: "ADMIN",
          locale: "en",
          theme: "light",
          avatarUrl: null
        }
      })
    });
  });

  await page.route("**/api/v1/admin/security/stats", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ activeBans: 1, bansToday: 2, attemptsBlockedToday: 5, whitelistedIps: 3 }) });
  });

  await page.route("**/api/v1/admin/security/bans**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [{ id: "ban-1", banType: "IP", reason: "MANUAL_ADMIN", ipAddress: "1.2.3.4", email: null, createdAt: new Date().toISOString(), expiresAt: null }], pagination: { page: 1, pages: 1, total: 1 } }) });
      return;
    }
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ id: "ban-1" }) });
  });

  await page.route("**/api/v1/admin/security/whitelist**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ id: "wl-1", ipAddress: "10.0.0.1", reason: "Admin auto-whitelist", createdAt: new Date().toISOString() }]) });
  });

  await page.route("**/api/v1/admin/security/logs**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [{ id: "log-1", type: "LOGIN", result: "BLOCKED_BAN", ipAddress: "1.2.3.4", emailAttempted: "x@y.com", attemptNumber: 26, createdAt: new Date().toISOString(), banApplied: true, lockoutApplied: false, captchaRequired: true }], pagination: { page: 1, pages: 1, total: 1 } }) });
  });

  await page.goto(`${baseUrl}/admin/security`);
  await expect(page.getByText("Active bans")).toBeVisible();

  await page.goto(`${baseUrl}/admin/security/logs`);
  await expect(page.getByText("Security Logs")).toBeVisible();
  await expect(page.getByText("BLOCKED_BAN")).toBeVisible();
});
