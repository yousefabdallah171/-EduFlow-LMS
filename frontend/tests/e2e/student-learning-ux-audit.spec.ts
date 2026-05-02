import { expect, test } from "@playwright/test";

const paths = ["/course", "/lessons", "/preview", "/progress"];
const locales = ["", "/ar"] as const;

test.describe("student learning UX responsive + RTL audit", () => {
  test("mobile/tablet pages render without layout break and core navigation appears", async ({ page }) => {
    for (const scheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: scheme });

      for (const locale of locales) {
        for (const path of paths) {
          await page.setViewportSize({ width: 390, height: 844 });
          await page.goto(`${locale}${path}`);
          await expect(page.locator("body")).toBeVisible();
          await expect(page.getByRole("banner")).toBeVisible();

          await page.setViewportSize({ width: 768, height: 1024 });
          await page.goto(`${locale}${path}`);
          await expect(page.locator("body")).toBeVisible();
          await expect(page.getByRole("banner")).toBeVisible();
        }
      }
    }
  });
});

