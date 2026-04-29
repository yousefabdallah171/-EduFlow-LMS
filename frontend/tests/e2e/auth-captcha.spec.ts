import { expect, test } from "@playwright/test";

test("login captcha flow", async ({ page }) => {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

  let loginAttempts = 0;

  await page.route("**/api/v1/auth/login", async (route) => {
    loginAttempts += 1;

    if (loginAttempts <= 5) {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "INVALID_CREDENTIALS", message: "Invalid credentials" })
      });
      return;
    }

    if (loginAttempts === 6) {
      await route.fulfill({
        status: 422,
        contentType: "application/json",
        body: JSON.stringify({ error: "CAPTCHA_REQUIRED", captchaRequired: true })
      });
      return;
    }

    await route.fulfill({
      status: 429,
      contentType: "application/json",
      headers: { "retry-after": "300" },
      body: JSON.stringify({ error: "ACCOUNT_LOCKED" })
    });
  });

  await page.goto(`${baseUrl}/login`);

  for (let i = 0; i < 6; i += 1) {
    await page.getByLabel("Email").fill("student@example.com");
    await page.getByLabel("Password").fill("wrong-pass");
    await page.getByRole("button", { name: "Sign in" }).click();
  }

  await expect(page.getByText("Too many attempts. Please complete the verification below.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Dev CAPTCHA bypass/i })).toBeVisible();

  await page.getByRole("button", { name: /Dev CAPTCHA bypass/i }).click();
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByText("Account temporarily locked. Try again in 5 minutes.")).toBeVisible();
});
