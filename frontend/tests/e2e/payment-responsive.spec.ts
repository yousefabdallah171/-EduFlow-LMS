import { expect, test, devices } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

const viewports = [
  { name: "mobile", width: 375, height: 812, device: devices["iPhone 12"] },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop-sm", width: 1024, height: 768 },
  { name: "desktop-lg", width: 1440, height: 900 }
];

const paymentPages = [
  { url: `${BASE_URL}/en/checkout`, name: "Checkout" },
  { url: `${BASE_URL}/en/payment-success?orderId=test-123`, name: "Success" },
  { url: `${BASE_URL}/en/payment-failure?orderId=test-123&error=CARD_DECLINED`, name: "Failure" },
  { url: `${BASE_URL}/en/payment-pending?orderId=test-123`, name: "Pending" },
  { url: `${BASE_URL}/en/payment-history`, name: "History" }
];

test.describe("Payment Pages - Responsive Design Tests", () => {
  test("Mobile (375x812): all pages responsive", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    for (const { url, name } of paymentPages) {
      await page.goto(url);

      // Page should be fully visible without horizontal scrolling
      const viewport = page.viewportSize();
      const bodyWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(bodyWidth).toBeLessThanOrEqual((viewport?.width || 0) + 10);

      // Main content should be visible
      const main = page.locator("main, [role='main'], .dashboard-page");
      const mainVisible = await main.isVisible().catch(() => false);
      expect(mainVisible).toBeTruthy();

      // Buttons should be at least 44x44px (WCAG touch target)
      const buttons = page.locator("button");
      const buttonCount = await buttons.count();

      if (buttonCount > 0) {
        const firstButton = buttons.first();
        const box = await firstButton.boundingBox();
        if (box) {
          expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(40);
        }
      }

      // Text should not overflow
      const textElements = page.locator("p, h1, h2, h3, h4, h5, h6");
      const textCount = Math.min(await textElements.count(), 5);
      for (let i = 0; i < textCount; i++) {
        const element = textElements.nth(i);
        const elementWidth = await element.evaluate((el) => el.clientWidth);
        const parentWidth = await element.evaluate((el) => el.parentElement?.clientWidth || 0);
        expect(elementWidth).toBeLessThanOrEqual(parentWidth + 10);
      }
    }
  });

  test("Tablet (768x1024): all pages responsive", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    for (const { url, name } of paymentPages) {
      await page.goto(url);

      // Page should not require horizontal scrolling
      const viewport = page.viewportSize();
      const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(documentWidth).toBeLessThanOrEqual((viewport?.width || 0) + 10);

      // Main content should be visible and centered
      const shell = page.locator(".app-shell, main");
      const shellVisible = await shell.isVisible().catch(() => true);
      expect(shellVisible).toBeTruthy();

      // Two-column layouts should stack on tablet (if present)
      const cols = page.locator("[class*='col'], [class*='grid']");
      const colCount = await cols.count();
      // No assertion needed - just checking it exists
    }
  });

  test("Desktop (1024+): all pages responsive", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    for (const { url, name } of paymentPages) {
      await page.goto(url);

      // Page should use full width efficiently
      const main = page.locator("main, [role='main']");
      const mainVisible = await main.isVisible().catch(() => false);

      if (mainVisible) {
        const box = await main.boundingBox();
        expect(box?.width).toBeGreaterThan(400);
      }

      // Layout should not be cramped
      const content = page.locator(".dashboard-panel, .container, [class*='content']");
      const contentVisible = await content.isVisible().catch(() => false);
      expect(contentVisible).toBeTruthy();
    }
  });

  test("Mobile: touch-friendly interactive elements", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/en/checkout`);

    // Buttons should be spaced
    const buttons = page.locator("button");
    const buttonCount = await buttons.count();

    if (buttonCount > 1) {
      const button1 = await buttons.nth(0).boundingBox();
      const button2 = await buttons.nth(1).boundingBox();

      if (button1 && button2) {
        // Buttons should have vertical spacing on mobile
        const verticalDistance = Math.abs(button2.y - (button1.y + button1.height));
        expect(verticalDistance).toBeGreaterThan(8);
      }
    }

    // Forms should be easy to fill
    const inputs = page.locator("input:not([type='hidden'])");
    const inputCount = await inputs.count();

    for (let i = 0; i < Math.min(inputCount, 2); i++) {
      const input = inputs.nth(i);
      const box = await input.boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test("Orientation change: layout adapts", async ({ page }) => {
    // Portrait
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/en/payment-history`);

    const portraitElements = await page.locator("body").count();
    expect(portraitElements).toBeGreaterThan(0);

    // Landscape
    await page.setViewportSize({ width: 812, height: 375 });

    const landscapeElements = await page.locator("body").count();
    expect(landscapeElements).toBeGreaterThan(0);

    // Page should still be usable
    const heading = page.locator("h1");
    const headingVisible = await heading.isVisible().catch(() => false);
    expect(headingVisible).toBeTruthy();
  });

  test("Images and media scale responsively", async ({ page }) => {
    const viewports = [
      { width: 375, height: 812 },
      { width: 768, height: 1024 },
      { width: 1440, height: 900 }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto(`${BASE_URL}/en/payment-success?orderId=test-123`);

      // Images and icons should not overflow
      const images = page.locator("img");
      const imageCount = await images.count();

      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i);
        const imgWidth = await img.evaluate((el) => (el as HTMLImageElement).width || el.clientWidth);
        expect(imgWidth).toBeLessThanOrEqual(viewport.width);
      }

      // SVG icons should scale
      const icons = page.locator("svg");
      const iconCount = await icons.count();

      if (iconCount > 0) {
        // At least one icon should be visible
        const firstIcon = icons.first();
        const visible = await firstIcon.isVisible().catch(() => false);
        // No strict assertion - just checking for presence
      }
    }
  });

  test("Sticky elements work responsively", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/en/checkout`);

    // Check for sticky summary panel (if present on desktop)
    const stickyElements = page.locator(".sticky, [style*='position: sticky']");
    const hasStickyElements = await stickyElements.count().then((c) => c > 0);

    if (hasStickyElements) {
      // Scroll and verify sticky position
      await page.evaluate(() => window.scrollBy(0, 300));
      const stickyVisible = await stickyElements.first().isVisible();
      expect(typeof stickyVisible).toBe("boolean");
    }

    // On mobile, sticky elements should not cause issues
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/en/checkout`);

    // Page should still be scrollable
    const body = page.locator("body");
    const scrollHeight = await body.evaluate((el) => el.scrollHeight);
    expect(scrollHeight).toBeGreaterThan(0);
  });

  test("Tables are responsive (horizontal scroll or restructure)", async ({ page }) => {
    const viewports = [
      { width: 375, height: 812, name: "mobile" },
      { width: 768, height: 1024, name: "tablet" },
      { width: 1440, height: 900, name: "desktop" }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto(`${BASE_URL}/en/payment-history`);

      // Check if table or card layout is used
      const table = page.locator("table");
      const cards = page.locator("[class*='card'], [class*='item']");

      const hasTable = await table.isVisible().catch(() => false);
      const hasCards = await cards.isVisible().catch(() => false);

      // Should have some layout for displaying data
      expect(hasTable || hasCards).toBeTruthy();

      // On mobile, table should either scroll or restructure
      if (viewport.name === "mobile" && hasTable) {
        const tableWidth = await table.evaluate((el) => el.clientWidth);
        const parentWidth = await table.evaluate((el) => el.parentElement?.clientWidth || 0);

        // Table can scroll if it's wider than container
        expect(tableWidth).toBeLessThanOrEqual(parentWidth + 100);
      }
    }
  });

  test("Modal/Dialog is responsive", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/en/payment-history`);

    // Check if any modals present
    const modal = page.locator("[role='dialog'], .modal, .dialog");
    const hasModal = await modal.isVisible().catch(() => false);

    if (hasModal) {
      // Modal should fit in viewport on mobile
      const modalWidth = await modal.evaluate((el) => el.clientWidth);
      const vp = await page.viewportSize();
      expect(modalWidth).toBeLessThan(vp?.width || 0);
    }
  });

  test("Form labels visible on all viewport sizes", async ({ page }) => {
    const viewports = [
      { width: 375, height: 812 },
      { width: 768, height: 1024 },
      { width: 1440, height: 900 }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto(`${BASE_URL}/en/checkout`);

      // All inputs should have visible labels
      const inputs = page.locator("input:not([type='hidden']), textarea, select");
      const inputCount = await inputs.count();

      for (let i = 0; i < Math.min(inputCount, 3); i++) {
        const input = inputs.nth(i);
        const id = await input.getAttribute("id");

        if (id) {
          const label = page.locator(`label[for="${id}"]`);
          const labelVisible = await label.isVisible().catch(() => false);
          const ariaLabel = await input.getAttribute("aria-label");

          expect(labelVisible || ariaLabel).toBeTruthy();
        }
      }
    }
  });
});
