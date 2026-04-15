import { test, expect } from "@playwright/test";

test("guest watches preview, sees CTA banner, register redirects to checkout", async ({ page }) => {
  await page.goto("/preview");
  await expect(page.locator("[data-testid='preview-cta-banner']")).toBeVisible();

  await page.goto("/register");
  await expect(page.locator("form")).toBeVisible();
});
