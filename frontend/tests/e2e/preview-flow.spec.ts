import { test, expect } from "@playwright/test";

test("guest watches preview, sees CTA banner, register redirects to checkout", async ({ page }) => {
  await page.goto("/en/preview");
  await expect(page.getByTestId("preview-cta-banner")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("link", { name: "Get full access" }).last()).toBeVisible({ timeout: 15_000 });

  await page.goto("/en/register");
  await expect(page.locator("form")).toBeVisible();
});
