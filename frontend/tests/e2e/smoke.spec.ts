import { expect, test } from "@playwright/test";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

const adminUser = {
  email: "admin@eduflow.com",
  password: "Admin1234!"
};

const studentUser = {
  email: "student@eduflow.com",
  password: "Student12345!"
};

const trackConsoleErrors = (page: { on: Function }) => {
  const errors: string[] = [];
  const httpErrors: string[] = [];

  page.on("pageerror", (error: Error) => {
    errors.push(error.message);
  });

  page.on("console", (message: { type: () => string; text: () => string }) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });

  page.on("response", async (response: { status: () => number; url: () => string }) => {
    const status = response.status();
    if (status >= 400) {
      httpErrors.push(`${status} ${response.url()}`);
    }
  });

  return { errors, httpErrors };
};

const login = async (page: any, user: { email: string; password: string }) => {
  await page.goto(`${baseUrl}/en/login`, { waitUntil: "networkidle" });
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  const responsePromise = page.waitForResponse(
    (response: { url: () => string }) => response.url().endsWith("/api/v1/auth/login"),
    { timeout: 10000 }
  );
  await page.locator('button[type="submit"]').click();
  const response = await responsePromise;
  if (response.status() !== 200) {
    throw new Error(`Login failed with status ${response.status()}`);
  }
  await page.waitForTimeout(500);
};

test.describe("frontend smoke (chromium)", () => {
  test("public pages render without console errors", async ({ page }) => {
    const { errors, httpErrors } = trackConsoleErrors(page);

    await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
    await page.goto(`${baseUrl}/en/login`, { waitUntil: "networkidle" });
    await page.goto(`${baseUrl}/en/register`, { waitUntil: "networkidle" });
    await page.goto(`${baseUrl}/en/checkout`, { waitUntil: "networkidle" });

    expect(httpErrors, `HTTP errors: ${httpErrors.join(" | ")}`).toEqual([]);
    expect(errors, `Console errors: ${errors.join(" | ")}`).toEqual([]);
  });

  test("student flow works without console errors", async ({ page }) => {
    const { errors, httpErrors } = trackConsoleErrors(page);

    await login(page, studentUser);
    await page.waitForTimeout(1000);
    await page.goto(`${baseUrl}/en/course`, { waitUntil: "networkidle" });
    await expect(page).toHaveURL(`${baseUrl}/en/course`);
    await expect(page.getByRole("heading", { name: "AI Workflow Student" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Lessons" })).toBeVisible();
    await page.goto(`${baseUrl}/en/lessons/seed-1`, { waitUntil: "networkidle" });
    await expect(page).toHaveURL(`${baseUrl}/en/lessons/seed-1`);

    expect(httpErrors, `HTTP errors: ${httpErrors.join(" | ")}`).toEqual([]);
    expect(errors, `Console errors: ${errors.join(" | ")}`).toEqual([]);
  });

  test("admin flow works without console errors", async ({ page }) => {
    const { errors, httpErrors } = trackConsoleErrors(page);

    await login(page, adminUser);
    await page.waitForTimeout(1000);
    await page.goto(`${baseUrl}/en/admin/lessons`, { waitUntil: "networkidle" });
    await expect(page).toHaveURL(`${baseUrl}/en/admin/lessons`);
    await page.goto(`${baseUrl}/en/admin/students`, { waitUntil: "networkidle" });
    await expect(page).toHaveURL(`${baseUrl}/en/admin/students`);

    expect(httpErrors, `HTTP errors: ${httpErrors.join(" | ")}`).toEqual([]);
    expect(errors, `Console errors: ${errors.join(" | ")}`).toEqual([]);
  });
});
