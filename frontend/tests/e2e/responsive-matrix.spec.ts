import { expect, test, type Page } from "@playwright/test";

const studentUser = {
  email: "student@eduflow.com",
  password: "Student12345!"
};

const adminUser = {
  email: "admin@eduflow.com",
  password: "Admin1234!"
};

type Locale = "en" | "ar";
type Theme = "light" | "dark";

const viewports = [
  { name: "mobile", size: { width: 390, height: 844 } },
  { name: "tablet", size: { width: 768, height: 1024 } },
  { name: "desktop", size: { width: 1366, height: 768 } }
] as const;

const publicPaths = [
  "/",
  "/about",
  "/testimonials",
  "/faq",
  "/contact",
  "/pricing",
  "/roadmap",
  "/privacy",
  "/terms",
  "/refund",
  "/preview",
  "/course",
  "/login",
  "/register",
  "/checkout",
  "/forgot-password"
] as const;

const studentPaths = [
  "/dashboard",
  "/course",
  "/lessons",
  "/lessons/seed-1",
  "/progress",
  "/notes",
  "/downloads",
  "/orders",
  "/profile",
  "/help",
  "/payment/history"
] as const;

const adminPaths = [
  "/admin/dashboard",
  "/admin/lessons",
  "/admin/students",
  "/admin/pricing",
  "/admin/analytics",
  "/admin/orders",
  "/admin/media",
  "/admin/audit",
  "/admin/security",
  "/admin/security/logs",
  "/admin/tickets",
  "/admin/settings",
  "/admin/notifications"
] as const;

const withLocale = (locale: Locale, path: string) => `/${locale}${path === "/" ? "" : path}`;

const expectLocaleDir = async (page: Page, locale: Locale) => {
  const html = page.locator("html");
  await expect(html).toHaveAttribute("lang", locale);
  await expect(html).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
};

const ensureTheme = async (page: Page, target: Theme) => {
  const html = page.locator("html");
  const wantsDark = target === "dark";
  const hasDark = await html.evaluate((element) => element.classList.contains("dark"));
  if (hasDark === wantsDark) return;

  // Theme button label is localized and depends on current theme state.
  const toggle = page.getByRole("button", {
    name: /Switch to (light|dark) mode|التبديل إلى الوضع (الفاتح|الداكن)/
  });

  await toggle.click({ timeout: 10_000 });
  await expect(html).toHaveClass(wantsDark ? /dark/ : /^(?!.*\bdark\b).*$/);
};

const login = async (page: Page, user: { email: string; password: string }, role: "student" | "admin") => {
  await page.goto("/en/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  const responsePromise = page.waitForResponse((response) => response.url().includes("/api/v1/auth/login"), {
    timeout: 20_000
  });
  await page.locator('button[type="submit"]').click();
  const response = await responsePromise;
  expect(response.status(), "login should succeed").toBe(200);

  // Student may land on /dashboard or /course; admin should land on /admin/dashboard.
  const urlPattern =
    role === "admin" ? /\/en\/admin\/dashboard$/ : /\/en\/(dashboard|course)$/;
  await page.waitForURL(urlPattern, { timeout: 25_000 }).catch(() => undefined);
};

const expectNoHorizontalOverflow = async (page: Page, context: string) => {
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth > 4);
  expect(hasOverflow, `horizontal overflow: ${context}`).toBe(false);
};

const openMobileNav = async (page: Page, locale: Locale) => {
  const openButton = page.getByRole("button", { name: /Open navigation|فتح القائمة/ });
  await expect(openButton).toBeVisible();
  await openButton.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  // Validate that EN opens from the left; AR opens from the right.
  const styles = await dialog.evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      left: s.left,
      right: s.right,
      insetInlineStart: (s as any).insetInlineStart ?? "",
      insetInlineEnd: (s as any).insetInlineEnd ?? ""
    };
  });

  if (locale === "en") {
    expect(
      [styles.left, styles.insetInlineStart].some((value) => value === "0px"),
      `EN drawer should be anchored left (left/start = 0px). got ${JSON.stringify(styles)}`
    ).toBe(true);
  } else {
    expect(
      [styles.right, styles.insetInlineEnd].some((value) => value === "0px"),
      `AR drawer should be anchored right (right/end = 0px). got ${JSON.stringify(styles)}`
    ).toBe(true);
  }

  return dialog;
};

const expectStudentDrawerLinks = async (dialog: ReturnType<Page["locator"]>, locale: Locale) => {
  const prefix = `/${locale}`;
  const targets = [
    `${prefix}/dashboard`,
    `${prefix}/course`,
    `${prefix}/progress`,
    `${prefix}/notes`,
    `${prefix}/downloads`,
    `${prefix}/orders`,
    `${prefix}/profile`,
    `${prefix}/help`
  ];

  for (const href of targets) {
    await expect(dialog.locator(`a[href="${href}"]`)).toBeVisible();
  }
};

const expectAdminDrawerLinks = async (dialog: ReturnType<Page["locator"]>, locale: Locale) => {
  const prefix = `/${locale}`;
  const targets = [`${prefix}/admin/dashboard`, `${prefix}/admin/lessons`, `${prefix}/admin/students`];
  for (const href of targets) {
    await expect(dialog.locator(`a[href="${href}"]`)).toBeVisible();
  }
};

test.describe("responsive matrix (locale + theme + viewport)", () => {
  test.setTimeout(240_000);

  for (const viewport of viewports) {
    test.describe(`${viewport.name}`, () => {
      test.use({ viewport: viewport.size });

      for (const theme of ["light", "dark"] as const) {
        test(`public routes render (${theme})`, async ({ page }) => {
          await page.goto("/en/", { waitUntil: "domcontentloaded" });
          await ensureTheme(page, theme);

          for (const locale of ["en", "ar"] as const) {
            for (const path of publicPaths) {
              const route = withLocale(locale, path);
              await page.goto(route, { waitUntil: "domcontentloaded" });
              await expectLocaleDir(page, locale);
              await page.waitForTimeout(150);
              await expectNoHorizontalOverflow(page, `${viewport.name}:${theme}:${route}`);
            }
          }
        });

        test(`student routes render after login (${theme})`, async ({ page }) => {
          await login(page, studentUser, "student");
          await page.waitForURL(/\/en\/(dashboard|course)$/, { timeout: 20_000 }).catch(() => undefined);

          // Make sure theme can be toggled after auth (user theme may be persisted server-side).
          await page.goto("/en/dashboard", { waitUntil: "domcontentloaded" });
          await ensureTheme(page, theme);

          for (const locale of ["en", "ar"] as const) {
            const firstRoute = withLocale(locale, "/dashboard");
            await page.goto(firstRoute, { waitUntil: "domcontentloaded" });
            await expectLocaleDir(page, locale);

            // Off-canvas must be accessible on mobile/tablet; on desktop it's hidden and we skip.
            if (viewport.name !== "desktop") {
              const dialog = await openMobileNav(page, locale);
              await expectStudentDrawerLinks(dialog, locale);
              await page.keyboard.press("Escape").catch(() => undefined);
            }

            for (const path of studentPaths) {
              const route = withLocale(locale, path);
              await page.goto(route, { waitUntil: "domcontentloaded" });
              await expectLocaleDir(page, locale);
              await page.waitForTimeout(200);
              await expectNoHorizontalOverflow(page, `${viewport.name}:${theme}:${route}`);
            }
          }
        });

        test(`admin routes render after login (${theme})`, async ({ page, request }) => {
          const apiBase = process.env.PLAYWRIGHT_BACKEND_BASE_URL ?? "http://localhost:3000";
          let firstStudentId: string | undefined;

          // Resolve a seeded student id for the student-detail route (avoid hardcoding).
          const loginResponse = await request.post(`${apiBase}/api/v1/auth/login`, { data: adminUser });
          if (loginResponse.ok()) {
            const loginPayload = (await loginResponse.json()) as { accessToken?: string };
            if (loginPayload.accessToken) {
              const studentsResponse = await request.get(`${apiBase}/api/v1/admin/students?limit=1`, {
                headers: { Authorization: `Bearer ${loginPayload.accessToken}` }
              });
              if (studentsResponse.ok()) {
                const studentsPayload = (await studentsResponse.json()) as { data?: Array<{ id: string }> };
                firstStudentId = studentsPayload.data?.[0]?.id;
              }
            }
          }

          await login(page, adminUser, "admin");
          await page.waitForURL(/\/en\/admin\/dashboard$/, { timeout: 20_000 }).catch(() => undefined);

          await page.goto("/en/admin/dashboard", { waitUntil: "domcontentloaded" });
          await ensureTheme(page, theme);

          for (const locale of ["en", "ar"] as const) {
            const firstRoute = withLocale(locale, "/admin/dashboard");
            await page.goto(firstRoute, { waitUntil: "domcontentloaded" });
            await expectLocaleDir(page, locale);

            if (viewport.name !== "desktop") {
              const dialog = await openMobileNav(page, locale);
              await expectAdminDrawerLinks(dialog, locale);
              await page.keyboard.press("Escape").catch(() => undefined);
            }

            for (const path of adminPaths) {
              const route = withLocale(locale, path);
              await page.goto(route, { waitUntil: "domcontentloaded" });
              await expectLocaleDir(page, locale);
              await page.waitForTimeout(200);
              await expectNoHorizontalOverflow(page, `${viewport.name}:${theme}:${route}`);
            }

            if (firstStudentId) {
              const detailRoute = withLocale(locale, `/admin/students/${firstStudentId}`);
              await page.goto(detailRoute, { waitUntil: "domcontentloaded" });
              await expectLocaleDir(page, locale);
              await expectNoHorizontalOverflow(page, `${viewport.name}:${theme}:${detailRoute}`);
            }
          }
        });
      }
    });
  }
});
