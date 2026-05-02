import { expect, test } from "@playwright/test";

const routes = ["/", "/roadmap", "/pricing", "/faq", "/contact"];

const assertHeaderAndMenu = async (page: import("@playwright/test").Page) => {
  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByRole("button", { name: /switch language/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /switch language/i }).locator("span").first()).toBeVisible();
  const mobileMenu = page.getByRole("button", { name: /open navigation/i });
  if (await mobileMenu.isVisible()) {
    await mobileMenu.click();
    await expect(page.getByRole("navigation", { name: /mobile primary/i })).toBeVisible();
  }
};

test.describe("landing marketing full audit", () => {
  test("mobile + tablet responsive, header, off-canvas, locale switch, dark/light", async ({ page }) => {
    for (const mode of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: mode });

      for (const localePrefix of ["", "/ar"] as const) {
        for (const route of routes) {
          await page.setViewportSize({ width: 390, height: 844 });
          await page.goto(`${localePrefix}${route}`);
          await assertHeaderAndMenu(page);
          await expect(page.locator("body")).toBeVisible();

          await page.setViewportSize({ width: 768, height: 1024 });
          await page.goto(`${localePrefix}${route}`);
          await assertHeaderAndMenu(page);
          await expect(page.locator("body")).toBeVisible();
        }
      }
    }
  });
});

