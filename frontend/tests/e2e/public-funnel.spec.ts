import { test, expect } from "@playwright/test";

test("public funnel: Landing -> About -> Pricing -> Register", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();

  await page.goto("/about");
  await expect(page.locator("h1")).toBeVisible();

  await page.goto("/pricing");
  await expect(page.locator("h1")).toBeVisible();

  await page.goto("/register");
  await expect(page.locator("form")).toBeVisible();
});
