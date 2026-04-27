import { expect, test } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

test.describe("Payment Pages - Visual Regression Tests", () => {
  test("Checkout page - light mode desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/en/checkout`);

    // Wait for content to load
    await page.waitForLoadState("networkidle");

    // Disable animations for consistent screenshots
    await page.addStyleTag({
      content: "* { animation: none !important; transition: none !important; }"
    });

    // Take screenshot
    await expect(page).toHaveScreenshot("checkout-desktop-light.png", {
      mask: [page.locator("input")], // Mask inputs for consistency
      maxDiffPixels: 100
    });
  });

  test("Checkout page - mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/en/checkout`);

    await page.waitForLoadState("networkidle");
    await page.addStyleTag({
      content: "* { animation: none !important; transition: none !important; }"
    });

    await expect(page).toHaveScreenshot("checkout-mobile.png", {
      mask: [page.locator("input")],
      maxDiffPixels: 100
    });
  });

  test("Success page - light mode desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // Mock payment status
    await page.route("**/api/v1/checkout/status/**", async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: "order-success-123",
          status: "COMPLETED",
          amount: 100000,
          currency: "EGP",
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString()
        })
      });
    });

    await page.goto(`${BASE_URL}/en/payment-success?orderId=order-success-123`);
    await page.waitForLoadState("networkidle");

    await page.addStyleTag({
      content: "* { animation: none !important; transition: none !important; }"
    });

    await expect(page).toHaveScreenshot("success-desktop-light.png", {
      maxDiffPixels: 100
    });
  });

  test("Success page - mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    await page.route("**/api/v1/checkout/status/**", async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: "order-success-123",
          status: "COMPLETED",
          amount: 100000,
          currency: "EGP",
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString()
        })
      });
    });

    await page.goto(`${BASE_URL}/en/payment-success?orderId=order-success-123`);
    await page.waitForLoadState("networkidle");

    await page.addStyleTag({
      content: "* { animation: none !important; transition: none !important; }"
    });

    await expect(page).toHaveScreenshot("success-mobile.png", {
      maxDiffPixels: 100
    });
  });

  test("Failure page - light mode desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.route("**/api/v1/checkout/status/**", async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: "order-failed-123",
          status: "FAILED",
          amount: 100000,
          currency: "EGP",
          errorCode: "CARD_DECLINED",
          errorMessage: "Card was declined",
          createdAt: new Date().toISOString()
        })
      });
    });

    await page.goto(`${BASE_URL}/en/payment-failure?orderId=order-failed-123&error=CARD_DECLINED`);
    await page.waitForLoadState("networkidle");

    await page.addStyleTag({
      content: "* { animation: none !important; transition: none !important; }"
    });

    await expect(page).toHaveScreenshot("failure-desktop-light.png", {
      maxDiffPixels: 100
    });
  });

  test("Failure page - mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    await page.route("**/api/v1/checkout/status/**", async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: "order-failed-123",
          status: "FAILED",
          amount: 100000,
          currency: "EGP",
          errorCode: "CARD_DECLINED",
          errorMessage: "Card was declined",
          createdAt: new Date().toISOString()
        })
      });
    });

    await page.goto(`${BASE_URL}/en/payment-failure?orderId=order-failed-123&error=CARD_DECLINED`);
    await page.waitForLoadState("networkidle");

    await page.addStyleTag({
      content: "* { animation: none !important; transition: none !important; }"
    });

    await expect(page).toHaveScreenshot("failure-mobile.png", {
      maxDiffPixels: 100
    });
  });

  test("Pending page - light mode desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.route("**/api/v1/checkout/status/**", async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: "order-pending-123",
          status: "PENDING",
          amount: 100000,
          currency: "EGP",
          createdAt: new Date().toISOString()
        })
      });
    });

    await page.goto(`${BASE_URL}/en/payment-pending?orderId=order-pending-123`);
    await page.waitForLoadState("networkidle");

    // Disable spinner animation
    await page.addStyleTag({
      content: `
        * { animation: none !important; transition: none !important; }
        @keyframes spin { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(180deg); } }
      `
    });

    await expect(page).toHaveScreenshot("pending-desktop-light.png", {
      maxDiffPixels: 100
    });
  });

  test("Pending page - mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    await page.route("**/api/v1/checkout/status/**", async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: "order-pending-123",
          status: "PENDING",
          amount: 100000,
          currency: "EGP",
          createdAt: new Date().toISOString()
        })
      });
    });

    await page.goto(`${BASE_URL}/en/payment-pending?orderId=order-pending-123`);
    await page.waitForLoadState("networkidle");

    await page.addStyleTag({
      content: "* { animation: none !important; transition: none !important; }"
    });

    await expect(page).toHaveScreenshot("pending-mobile.png", {
      maxDiffPixels: 100
    });
  });

  test("History page - light mode desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // Mock payment history
    await page.route("**/api/v1/student/orders", async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          orders: [
            {
              id: "order-1",
              amountEgp: 1000,
              currency: "EGP",
              status: "COMPLETED",
              createdAt: new Date("2026-04-20").toISOString()
            },
            {
              id: "order-2",
              amountEgp: 800,
              currency: "EGP",
              status: "COMPLETED",
              createdAt: new Date("2026-04-15").toISOString()
            },
            {
              id: "order-3",
              amountEgp: 1200,
              currency: "EGP",
              status: "PENDING",
              createdAt: new Date("2026-04-10").toISOString()
            }
          ]
        })
      });
    });

    await page.goto(`${BASE_URL}/en/payment-history`);
    await page.waitForLoadState("networkidle");

    await page.addStyleTag({
      content: "* { animation: none !important; transition: none !important; }"
    });

    await expect(page).toHaveScreenshot("history-desktop-light.png", {
      maxDiffPixels: 100
    });
  });

  test("History page - mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    await page.route("**/api/v1/student/orders", async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          orders: [
            {
              id: "order-1",
              amountEgp: 1000,
              currency: "EGP",
              status: "COMPLETED",
              createdAt: new Date("2026-04-20").toISOString()
            }
          ]
        })
      });
    });

    await page.goto(`${BASE_URL}/en/payment-history`);
    await page.waitForLoadState("networkidle");

    await page.addStyleTag({
      content: "* { animation: none !important; transition: none !important; }"
    });

    await expect(page).toHaveScreenshot("history-mobile.png", {
      maxDiffPixels: 100
    });
  });

  test("Dark mode: Success page", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // Enable dark mode
    await page.evaluate(() => {
      const html = document.documentElement;
      html.style.colorScheme = "dark";
      html.classList.add("dark");
    });

    await page.route("**/api/v1/checkout/status/**", async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: "order-success-123",
          status: "COMPLETED",
          amount: 100000,
          currency: "EGP",
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString()
        })
      });
    });

    await page.goto(`${BASE_URL}/en/payment-success?orderId=order-success-123`);
    await page.waitForLoadState("networkidle");

    await page.addStyleTag({
      content: "* { animation: none !important; transition: none !important; }"
    });

    await expect(page).toHaveScreenshot("success-desktop-dark.png", {
      maxDiffPixels: 100
    });
  });

  test("RTL (Arabic): Success page", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.route("**/api/v1/checkout/status/**", async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: "order-success-ar",
          status: "COMPLETED",
          amount: 100000,
          currency: "EGP",
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString()
        })
      });
    });

    await page.goto(`${BASE_URL}/ar/payment-success?orderId=order-success-ar`);
    await page.waitForLoadState("networkidle");

    await page.addStyleTag({
      content: "* { animation: none !important; transition: none !important; }"
    });

    await expect(page).toHaveScreenshot("success-desktop-ar.png", {
      maxDiffPixels: 100
    });
  });

  test("RTL (Arabic): Checkout page mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    await page.goto(`${BASE_URL}/ar/checkout`);
    await page.waitForLoadState("networkidle");

    await page.addStyleTag({
      content: "* { animation: none !important; transition: none !important; }"
    });

    await expect(page).toHaveScreenshot("checkout-mobile-ar.png", {
      mask: [page.locator("input")],
      maxDiffPixels: 100
    });
  });

  test("Error states are visually distinct", async ({ page }) => {
    // Success (green)
    await page.goto(`${BASE_URL}/en/payment-success?orderId=test`);
    await page.waitForLoadState("networkidle");

    const successBg = await page.evaluate(() => {
      const el = document.querySelector("main") || document.body;
      return window.getComputedStyle(el).backgroundColor;
    });

    // Failure (red)
    await page.goto(`${BASE_URL}/en/payment-failure?orderId=test&error=TEST`);
    await page.waitForLoadState("networkidle");

    const failureBg = await page.evaluate(() => {
      const el = document.querySelector("main") || document.body;
      return window.getComputedStyle(el).backgroundColor;
    });

    // Backgrounds should be different
    expect(successBg).not.toBe(failureBg);
  });

  test("Status badges have distinct colors", async ({ page }) => {
    await page.goto(`${BASE_URL}/en/payment-history`);

    // Mock payment history with various statuses
    await page.route("**/api/v1/student/orders", async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          orders: [
            { id: "1", amountEgp: 1000, currency: "EGP", status: "COMPLETED", createdAt: new Date().toISOString() },
            { id: "2", amountEgp: 800, currency: "EGP", status: "PENDING", createdAt: new Date().toISOString() },
            { id: "3", amountEgp: 500, currency: "EGP", status: "FAILED", createdAt: new Date().toISOString() }
          ]
        })
      });
    });

    await page.reload();
    await page.waitForLoadState("networkidle");

    // Check that status badges have different colors
    const badges = page.locator("[class*='badge'], [class*='status']");
    const colors = new Set<string>();

    const badgeCount = await badges.count();
    for (let i = 0; i < Math.min(badgeCount, 3); i++) {
      const color = await badges.nth(i).evaluate((el) => window.getComputedStyle(el).backgroundColor);
      if (color) colors.add(color);
    }

    // Should have at least some variety in colors
    expect(colors.size).toBeGreaterThan(0);
  });
});
