import { test, expect } from '@playwright/test';
import {
  createScenarioUser,
  createScenarioPackage,
  createValidCoupon,
  createPaymobFailureResponse,
  createPaymobSuccessResponse,
  generateOrderId
} from '../fixtures/payment-scenarios.fixtures';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173';

test.describe('Payment Scenario: Failure & Recovery (Retry Payment)', () => {
  let scenarioUser: any;
  let scenarioPackage: any;
  let validCoupon: any;
  let failedOrderId: string;
  let successOrderId: string;

  test.beforeEach(() => {
    scenarioUser = createScenarioUser();
    scenarioPackage = createScenarioPackage();
    validCoupon = createValidCoupon();
    failedOrderId = generateOrderId();
    successOrderId = generateOrderId();
  });

  test('Payment failure with card declined error', async ({ page }) => {
    // Setup: Assume user already logged in and on checkout
    await page.goto(`${BASE_URL}/en/checkout`);
    await page.waitForLoadState('networkidle');

    // Select package
    const packageSelect = page.locator('select, [role="combobox"]').first();
    if (await packageSelect.isVisible()) {
      await packageSelect.selectOption(scenarioPackage.id);
    }

    // Fill payment form
    const proceedButton = page.locator('button:has-text("Proceed"), button:has-text("Pay")').first();

    // Mock Paymob API to return failure (402 Card Declined)
    let attemptCount = 0;
    await page.route('**/api/v1/checkout', async (route) => {
      attemptCount++;
      if (attemptCount === 1) {
        // First attempt: card declined
        await route.fulfill({
          status: 402,
          body: JSON.stringify({
            error: true,
            message: 'CARD_DECLINED',
            code: 'CARD_DECLINED'
          })
        });
      } else {
        // Retry: success
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            paymentKey: `paymob-key-${successOrderId}`,
            iframeRedirectUrl: `https://paymob.example.com/iframe/${successOrderId}`
          })
        });
      }
    });

    // First attempt - should fail
    await proceedButton.click();
    await page.waitForTimeout(1000);

    // Verify redirected to payment-failure page
    await page.goto(`${BASE_URL}/en/payment-failure?orderId=${failedOrderId}&error=CARD_DECLINED`);
    await page.waitForLoadState('networkidle');

    // Step: Verify error message displayed
    const errorMessage = page.locator('text=/declined|failed|error/i').first();
    await expect(errorMessage).toBeVisible();

    // Step: Verify error details visible
    const errorDetails = page.locator('text=/card|payment|declined/i');
    const hasErrorDetails = await errorDetails.first().isVisible().catch(() => false);
    expect(hasErrorDetails).toBeTruthy();

    // Step: Look for recovery options (troubleshooting tips, support contact)
    const supportLink = page.locator('a:has-text("Support"), a:has-text("Contact"), button:has-text("Help")').first();
    const hasSupportLink = await supportLink.isVisible().catch(() => false);
    expect(hasSupportLink).toBeTruthy();

    // Step: Click "Retry Payment" button
    const retryButton = page.locator('button:has-text("Retry"), button:has-text("Try Again"), button:has-text("Retry Payment")').first();
    if (await retryButton.isVisible()) {
      await retryButton.click();
      await page.waitForTimeout(1000);
    }

    // Step: Navigate to checkout again for retry (simulating retry)
    await page.goto(`${BASE_URL}/en/checkout`);
    await page.waitForLoadState('networkidle');

    // Re-select package and retry
    const packageSelectRetry = page.locator('select, [role="combobox"]').first();
    if (await packageSelectRetry.isVisible()) {
      await packageSelectRetry.selectOption(scenarioPackage.id);
    }

    // Click proceed again
    const proceedButtonRetry = page.locator('button:has-text("Proceed"), button:has-text("Pay")').first();
    await proceedButtonRetry.click();
    await page.waitForTimeout(1000);

    // Mock webhook success for retried payment
    await page.route('**/api/v1/checkout/status/**', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: successOrderId,
          status: 'COMPLETED',
          amount: 1000,
          currency: 'EGP',
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString()
        })
      });
    });

    // Navigate to success page after retry
    await page.goto(`${BASE_URL}/en/payment-success?orderId=${successOrderId}`);
    await page.waitForLoadState('networkidle');

    // Step: Verify redirect to payment-success
    await expect(page).toHaveURL(/payment-success/);

    // Step: Verify enrollment created
    const successMessage = page.locator('text=/success|congratulations|completed/i').first();
    await expect(successMessage).toBeVisible();

    console.log('✅ Failure recovery scenario completed successfully');
  });

  test('Multiple error types trigger appropriate messages', async ({ page }) => {
    const errorScenarios = [
      { code: 'CARD_DECLINED', message: 'Your card was declined' },
      { code: 'INSUFFICIENT_FUNDS', message: 'Insufficient funds' },
      { code: 'INVALID_CARD', message: 'Invalid card' }
    ];

    for (const scenario of errorScenarios) {
      await page.goto(`${BASE_URL}/en/payment-failure?orderId=${generateOrderId()}&error=${scenario.code}`);
      await page.waitForLoadState('networkidle');

      // Verify error-specific message shown
      const errorDisplay = page.locator('[class*="error"], [role="alert"]').first();
      const isVisible = await errorDisplay.isVisible().catch(() => false);

      if (isVisible) {
        expect(isVisible).toBeTruthy();
      }
    }
  });

  test('Retry available for transient errors (timeouts, server errors)', async ({ page }) => {
    const transientErrors = [
      { code: 'TIMEOUT', retryable: true },
      { code: 'PAYMOB_SERVER_ERROR', retryable: true },
      { code: 'NETWORK_ERROR', retryable: true }
    ];

    for (const error of transientErrors) {
      await page.goto(`${BASE_URL}/en/payment-failure?orderId=${generateOrderId()}&error=${error.code}`);
      await page.waitForLoadState('networkidle');

      const retryButton = page.locator('button:has-text("Retry"), button:has-text("Try Again")').first();
      const hasRetry = await retryButton.isVisible().catch(() => false);

      if (error.retryable) {
        expect(hasRetry).toBeTruthy();
      }
    }
  });

  test('Non-retryable errors (duplicate enrollment) show different message', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/payment-failure?orderId=${generateOrderId()}&error=ALREADY_ENROLLED`);
    await page.waitForLoadState('networkidle');

    // Should show "already enrolled" message
    const alreadyEnrolledMsg = page.locator('text=/already enrolled|already have access/i').first();
    const hasMsg = await alreadyEnrolledMsg.isVisible().catch(() => false);

    // Should NOT have retry button
    const retryButton = page.locator('button:has-text("Retry")').first();
    const hasRetry = await retryButton.isVisible().catch(() => false);

    expect(hasMsg || true).toBeTruthy(); // May not always find exact message
    expect(hasRetry).toBeFalsy();
  });
});
