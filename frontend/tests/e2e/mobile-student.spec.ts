import { test, expect } from "@playwright/test";

test("T206: mobile student flow at 375px viewport", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/login");
  await expect(page.locator("form")).toBeVisible();
  await page.goto("/course");
  await expect(page.getByRole("button", { name: "Open navigation" })).toBeVisible();
  await page.goto("/register");
  await expect(page.locator("form")).toBeVisible();
});
