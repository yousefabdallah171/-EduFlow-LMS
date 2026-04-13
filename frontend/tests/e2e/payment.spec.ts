import { expect, test } from "@playwright/test";

test("student applies a coupon and starts Paymob checkout", async ({ page }) => {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

  await page.route("**/api/v1/auth/login", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        accessToken: "student-access-token",
        user: {
          id: "student-1",
          email: "student@example.com",
          fullName: "Student One",
          role: "STUDENT",
          locale: "en",
          theme: "light",
          avatarUrl: null
        }
      })
    });
  });

  await page.route("**/api/v1/enrollment", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ enrolled: false })
    });
  });

  await page.route("**/api/v1/course", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        priceEgp: 499,
        currency: "EGP"
      })
    });
  });

  await page.route("**/api/v1/checkout/validate-coupon", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        valid: true,
        discountType: "PERCENTAGE",
        discountValue: 20,
        originalAmountEgp: 499,
        discountedAmountEgp: 399.2
      })
    });
  });

  await page.route("**/api/v1/checkout", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        paymentKey: "paymob-token",
        orderId: "order-1",
        amount: 39920,
        currency: "EGP",
        discountApplied: 9980,
        iframeId: "12345"
      })
    });
  });

  await page.route("https://accept.paymob.com/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<html><body><h1>Mock Paymob Checkout</h1></body></html>"
    });
  });

  await page.goto(`${baseUrl}/login`);
  await page.getByLabel("Email").fill("student@example.com");
  await page.getByLabel("Password").fill("Securepass123");
  await page.getByRole("button", { name: "Log in" }).click();
  await page.goto(`${baseUrl}/checkout`);

  await page.getByLabel("Coupon code").fill("SAVE20");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByText("Coupon applied. New total: 399.20 EGP")).toBeVisible();

  await page.getByRole("button", { name: "Pay now" }).click();
  await expect(page).toHaveURL(/accept\.paymob\.com/);
  await expect(page.getByRole("heading", { name: "Mock Paymob Checkout" })).toBeVisible();
});
