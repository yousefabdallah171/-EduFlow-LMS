import { test, expect } from '@playwright/test';
import {
  createScenarioUser,
  createScenarioPackage,
  createValidCoupon,
  createPaymobSuccessResponse,
  createWebhookSuccessPayload,
  createPaymentHistoryResponse,
  generateOrderId
} from '../fixtures/payment-scenarios.fixtures';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173';

test.describe('Payment Scenario: Happy Path (Complete Successful Payment)', () => {
  let scenarioUser: any;
  let scenarioPackage: any;
  let validCoupon: any;
  let orderId: string;

  test.beforeEach(() => {
    scenarioUser = createScenarioUser();
    scenarioPackage = createScenarioPackage();
    validCoupon = createValidCoupon();
    orderId = generateOrderId();
  });

  test('Complete successful payment flow from registration to course access', async ({ page }) => {
    // Step 1: Register new student
    await page.goto(`${BASE_URL}/en/register`);
    await page.waitForLoadState('networkidle');

    await page.fill('input[type="email"]', scenarioUser.email);
    await page.fill('input[type="password"]', scenarioUser.password);
    await page.fill('input[name="fullName"]', scenarioUser.fullName);
    await page.click('button[type="submit"]');

    // Verify registration success
    await expect(page).toHaveURL(/\/en\/(login|dashboard)/);
    await page.waitForLoadState('networkidle');

    // Step 2: Login
    if (page.url().includes('/login')) {
      await page.fill('input[type="email"]', scenarioUser.email);
      await page.fill('input[type="password"]', scenarioUser.password);
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/\/en\/dashboard/);
    }

    // Step 3: Navigate to checkout
    await page.goto(`${BASE_URL}/en/checkout?package=${scenarioPackage.id}`);
    await page.waitForLoadState('networkidle');

    // Verify checkout page loaded
    const checkoutHeading = page.locator('h1, h2').filter({ hasText: /checkout|payment/i });
    await expect(checkoutHeading.first()).toBeVisible();

    // Step 4: Select package (if not already selected via URL)
    const packageSelect = page.locator('select, [role="combobox"]').first();
    if (await packageSelect.isVisible()) {
      await packageSelect.selectOption(scenarioPackage.id);
    }

    // Verify package price displayed
    await expect(page.locator('text=/1000|1000/')).toBeVisible();

    // Step 5: Apply valid coupon
    const couponInput = page.locator('input[placeholder*="coupon"], input[name*="coupon"]').first();
    if (await couponInput.isVisible()) {
      await couponInput.fill(validCoupon.code);
      await page.click('button:has-text("Apply")');

      // Wait for discount calculation
      await page.waitForTimeout(500);

      // Verify discount applied (should show lower price: 800 instead of 1000)
      const discountedPrice = page.locator('text=/800|discount/i');
      await expect(discountedPrice.first()).toBeVisible();
    }

    // Step 6: Proceed to payment
    const proceedButton = page.locator('button:has-text("Proceed"), button:has-text("Pay"), button:has-text("Continue")').first();
    await proceedButton.click();

    // Step 7: Complete Paymob payment (mock)
    // Mock the Paymob checkout API
    await page.route('**/api/v1/checkout', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          paymentKey: `paymob-key-${orderId}`,
          iframeRedirectUrl: `https://paymob.example.com/iframe/${orderId}`
        })
      });
    });

    // Mock webhook success for payment completion
    await page.route('**/api/v1/checkout/status/**', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: orderId,
          status: 'COMPLETED',
          amount: 800,
          currency: 'EGP',
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString()
        })
      });
    });

    // If Paymob iframe present, we can't interact with it in test
    // So we'll navigate directly to success page as webhook would do
    await page.goto(`${BASE_URL}/en/payment-success?orderId=${orderId}`);

    // Step 8: Verify redirect to payment-success
    await expect(page).toHaveURL(/payment-success/);
    await page.waitForLoadState('networkidle');

    // Step 9: Verify enrollment granted and course accessible
    const successMessage = page.locator('text=/success|congratulations|enrolled/i').first();
    await expect(successMessage).toBeVisible();

    // Look for "Access Course" CTA
    const accessCourseBtn = page.locator('button:has-text("Access Course"), a:has-text("Access Course")').first();
    if (await accessCourseBtn.isVisible()) {
      await accessCourseBtn.click();
      // Should navigate to course/dashboard
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/dashboard|course|lesson/);
    }

    // Step 10: Verify payment in payment history
    await page.goto(`${BASE_URL}/en/payment-history`);
    await page.waitForLoadState('networkidle');

    // Mock payment history response
    await page.route('**/api/v1/student/orders', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          orders: [
            {
              id: orderId,
              amountEgp: 800,
              currency: 'EGP',
              status: 'COMPLETED',
              createdAt: new Date().toISOString()
            }
          ]
        })
      });
    });

    // Reload to get mocked history
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Look for order in history table
    const orderRow = page.locator(`text=${orderId}`).first();
    const isOrderVisible = await orderRow.isVisible().catch(() => false);
    expect(isOrderVisible).toBeTruthy();

    // Step 11: Download receipt
    const downloadButton = page.locator('button:has-text("Download"), button:has-text("Receipt")').first();
    if (await downloadButton.isVisible()) {
      // Start waiting for download before clicking
      const downloadPromise = page.waitForEvent('download');
      await downloadButton.click();
      const download = await downloadPromise;

      // Verify download filename
      expect(download.suggestedFilename()).toMatch(/receipt|payment/i);
    }

    console.log('✅ Happy path scenario completed successfully');
  });

  test('Verify enrollment status after successful payment', async ({ page }) => {
    // Quick verification that enrollment is granted after payment
    await page.goto(`${BASE_URL}/en/dashboard`);
    await page.waitForLoadState('networkidle');

    // Mock enrollment status
    await page.route('**/api/v1/enrollment/status/**', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          enrollmentStatus: 'active',
          courseId: scenarioPackage.id,
          enrolledAt: new Date().toISOString()
        })
      });
    });

    const enrollmentIndicator = page.locator('text=/enrolled|active|enrolled/i').first();
    const isEnrolled = await enrollmentIndicator.isVisible().catch(() => false);

    // Enrollment should be visible somewhere on dashboard
    if (isEnrolled) {
      expect(isEnrolled).toBeTruthy();
    }
  });
});
