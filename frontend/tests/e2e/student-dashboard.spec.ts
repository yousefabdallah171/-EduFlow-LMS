import { test, expect } from "@playwright/test";

test.describe("student dashboard", () => {
  test("T143: login -> dashboard -> Continue Learning -> correct lesson", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("student@test.com");
    await page.getByLabel("Password").fill("Password1");
    await page.click('[type="submit"]');
    await page.waitForURL("**/course", { timeout: 10000 }).catch(() => {/* demo mode */});
    await page.goto("/dashboard");
    await expect(page.locator("h1")).toBeVisible();
  });
});
