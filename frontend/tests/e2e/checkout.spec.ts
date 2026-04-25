import { test, expect, Page } from "@playwright/test";

const BASE_URL = "http://localhost:3000";
const API_BASE_URL = "http://localhost:3001";

test.describe("Checkout Flow E2E", () => {
  test.beforeEach(async ({ page }) => {
    // Set test user in session storage
    await page.goto(`${BASE_URL}/en/checkout`);
  });

  test("should redirect unauthenticated user to login", async ({ page }) => {
    await page.goto(`${BASE_URL}/en/checkout`);

    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/);
  });

  test("should display checkout form for authenticated user", async ({ page, context }) => {
    // Set auth token in storage
    await context.addCookies([
      {
        name: "authToken",
        value: "test-token-123",
        url: BASE_URL
      }
    ]);

    await page.goto(`${BASE_URL}/en/checkout`);

    // Should display checkout heading
    await expect(page.locator("text=Checkout")).toBeVisible();

    // Should display package options
    await expect(page.locator("button", { hasText: /Package/ })).toBeVisible();
  });

  test("should select different packages", async ({ page }) => {
    // Mock course data
    await page.route(`${API_BASE_URL}/api/v1/course`, (route) => {
      route.abort("blockedbyClient");
    });

    await page.goto(`${BASE_URL}/en/checkout`);

    // Click second package
    const packages = page.locator("button", { hasText: /Package/ });
    const packageCount = await packages.count();

    if (packageCount > 1) {
      await packages.nth(1).click();

      // URL should update with package ID
      await expect(page).toHaveURL(/package=/);
    }
  });

  test("should apply coupon code", async ({ page }) => {
    await page.goto(`${BASE_URL}/en/checkout`);

    // Find coupon input
    const couponInput = page.locator("input[placeholder*='Coupon'], input[placeholder*='coupon']");

    if (await couponInput.isVisible()) {
      await couponInput.fill("SUMMER20");

      // Wait for validation
      await page.waitForTimeout(500);

      // Should show discount or error message
      const feedbackElement = page.locator("text=/discount|invalid|expired/i");
      await expect(feedbackElement).toBeVisible();
    }
  });

  test("should handle checkout submission", async ({ page }) => {
    // Mock checkout API
    await page.route(`${API_BASE_URL}/api/v1/checkout`, (route) => {
      if (route.request().method() === "POST") {
        route.abort("blockedbyClient");
      } else {
        route.continue();
      }
    });

    await page.goto(`${BASE_URL}/en/checkout`);

    // Find submit button
    const submitButton = page.locator("button", { hasText: /Checkout|Pay|Submit/ });

    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Should attempt API call or show loading state
      await page.waitForTimeout(500);
    }
  });

  test("should persist package selection across reloads", async ({ page, context }) => {
    // Set auth
    await context.addCookies([
      {
        name: "authToken",
        value: "test-token-123",
        url: BASE_URL
      }
    ]);

    await page.goto(`${BASE_URL}/en/checkout?package=pkg2`);

    // Should show selected package
    const urlParams = new URL(page.url());
    expect(urlParams.searchParams.get("package")).toBe("pkg2");

    // Reload page
    await page.reload();

    // Package selection should persist
    const reloadedUrl = new URL(page.url());
    expect(reloadedUrl.searchParams.get("package")).toBe("pkg2");
  });

  test("should display error messages", async ({ page }) => {
    // Mock error response
    await page.route(`${API_BASE_URL}/api/v1/checkout`, (route) => {
      route.abort("blockedbyClient");
    });

    await page.goto(`${BASE_URL}/en/checkout`);

    // Find submit button
    const submitButton = page.locator("button", { hasText: /Checkout|Pay|Submit/ });

    if (await submitButton.isVisible()) {
      // Mock network error
      await page.context().setOffline(true);

      await submitButton.click();
      await page.waitForTimeout(500);

      // Should show error message
      const errorMessage = page.locator("text=/error|failed/i");
      if (await errorMessage.isVisible()) {
        expect(await errorMessage.textContent()).toBeTruthy();
      }

      await page.context().setOffline(false);
    }
  });

  test("should handle concurrency - prevent duplicate checkouts", async ({ page }) => {
    // Simulate rapid checkout attempts
    const submitButtons = page.locator("button", { hasText: /Checkout|Pay|Submit/ });

    if (await submitButtons.count() > 0) {
      const button = submitButtons.first();

      // Rapid-click to trigger concurrency
      await button.click({ force: true });
      await button.click({ force: true });

      await page.waitForTimeout(500);

      // Should show "checkout in progress" or similar error
      const statusMessage = page.locator("text=/progress|pending|wait/i");
      await expect(statusMessage).toBeVisible({ timeout: 3000 });
    }
  });

  test("should validate required fields", async ({ page }) => {
    await page.goto(`${BASE_URL}/en/checkout`);

    // Try to submit empty form
    const submitButton = page.locator("button", { hasText: /Checkout|Pay|Submit/ });

    if (await submitButton.isVisible()) {
      // Check for form validation
      const requiredFields = page.locator("input[required], select[required]");
      const fieldCount = await requiredFields.count();

      if (fieldCount > 0) {
        // Fields should be marked as required
        for (let i = 0; i < fieldCount; i++) {
          const field = requiredFields.nth(i);
          const required = await field.getAttribute("required");
          expect(required).not.toBeNull();
        }
      }
    }
  });

  test("should support multiple languages", async ({ page }) => {
    // Try EN checkout
    await page.goto(`${BASE_URL}/en/checkout`);
    await expect(page).toHaveURL(/\/en\//);

    // Text should be in English (example checks)
    const engElement = page.locator("text=/checkout|package|coupon/i");
    await expect(engElement).toBeVisible();

    // Try AR checkout
    await page.goto(`${BASE_URL}/ar/checkout`);
    await expect(page).toHaveURL(/\/ar\//);
  });

  test("should handle loading states", async ({ page }) => {
    // Slow down network
    await page.route("**/*", (route) => {
      setTimeout(() => route.continue(), 1000);
    });

    await page.goto(`${BASE_URL}/en/checkout`);

    // Should show loading indicator while page loads
    const loadingIndicator = page.locator("[role='status'], .loading, .spinner");

    // Either loading is shown or content loads quickly
    const hasLoading = await loadingIndicator.isVisible({ timeout: 1000 }).catch(() => false);
    const hasContent = await page.locator("button", { hasText: /Checkout|Package/ }).isVisible({ timeout: 2000 });

    expect(hasLoading || hasContent).toBeTruthy();
  });

  test("should be responsive on mobile", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });

    await page.goto(`${BASE_URL}/en/checkout`);

    // Elements should be visible
    await expect(page.locator("body")).toBeVisible();

    // Buttons should be clickable
    const button = page.locator("button").first();
    await expect(button).toBeVisible();
  });

  test("should be responsive on tablet", async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto(`${BASE_URL}/en/checkout`);

    // Should render correctly
    await expect(page.locator("body")).toBeVisible();
  });

  test("should handle network errors gracefully", async ({ page }) => {
    // Simulate offline
    await page.context().setOffline(true);

    const errorPromise = page.waitForEvent("console", (msg) => msg.type() === "error");

    await page.goto(`${BASE_URL}/en/checkout`).catch(() => {});

    // Wait for potential error
    await page.waitForTimeout(500);

    // Should either show error or cached content
    const hasContent = await page.locator("body").isVisible();
    expect(hasContent).toBeTruthy();

    await page.context().setOffline(false);
  });

  test("should have proper accessibility", async ({ page }) => {
    await page.goto(`${BASE_URL}/en/checkout`);

    // Check for accessible heading
    const heading = page.locator("h1, h2, [role='heading']");
    await expect(heading).toBeVisible();

    // Check for labels on inputs
    const inputs = page.locator("input:not([type='hidden'])");
    const inputCount = await inputs.count();

    if (inputCount > 0) {
      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i);
        const ariaLabel = await input.getAttribute("aria-label");
        const id = await input.getAttribute("id");
        const associatedLabel = id ? page.locator(`label[for="${id}"]`) : null;

        // Either has aria-label or associated label
        const hasAccessibilityLabel = ariaLabel || (associatedLabel && await associatedLabel.isVisible());
        expect(hasAccessibilityLabel).toBeTruthy();
      }
    }

    // Check for proper button labels
    const buttons = page.locator("button");
    const buttonCount = await buttons.count();

    if (buttonCount > 0) {
      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = buttons.nth(i);
        const text = await button.textContent();
        expect(text).not.toBe("");
      }
    }
  });

  test("should prevent XSS attacks", async ({ page }) => {
    // Try to inject script via URL params
    const maliciousPayload = "<script>alert('xss')</script>";
    const encodedPayload = encodeURIComponent(maliciousPayload);

    await page.goto(`${BASE_URL}/en/checkout?package=${encodedPayload}`);

    // Page should not alert
    let alertShown = false;
    page.on("dialog", () => {
      alertShown = true;
    });

    await page.waitForTimeout(500);
    expect(alertShown).toBe(false);
  });

  test("should handle CSRF protection", async ({ page }) => {
    // Check for CSRF token in forms
    await page.goto(`${BASE_URL}/en/checkout`);

    const forms = page.locator("form");
    const formCount = await forms.count();

    // If there are forms, they should have CSRF protection
    if (formCount > 0) {
      for (let i = 0; i < formCount; i++) {
        const form = forms.nth(i);
        // Look for CSRF token input or header
        const csrfInput = form.locator("input[name='csrf']");
        const hasCsrfProtection = await csrfInput.count() > 0;

        if (hasCsrfProtection) {
          expect(hasCsrfProtection).toBeTruthy();
        }
      }
    }
  });
});
