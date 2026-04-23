import { test, expect } from "@playwright/test";

test("T207: RTL Arabic mode renders correctly", async ({ page }) => {
  await page.goto("/ar/register");
  const html = page.locator("html");
  await expect(html).toHaveAttribute("dir", "rtl");
  await expect(html).toHaveAttribute("lang", "ar");
  await page.goto("/ar/login");
  await expect(page.locator("form")).toBeVisible();
  await page.goto("/ar/about");
  await expect(page.locator("h1")).toBeVisible();
  await page.goto("/ar/faq");
  await expect(page.locator("h1")).toBeVisible();
});
