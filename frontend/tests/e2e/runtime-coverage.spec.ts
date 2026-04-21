import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const studentUser = {
  email: "student@eduflow.com",
  password: "Student12345!"
};

const adminUser = {
  email: "admin@eduflow.com",
  password: "Admin1234!"
};

const publicRoutes = [
  "/en/",
  "/en/about",
  "/en/testimonials",
  "/en/faq",
  "/en/contact",
  "/en/pricing",
  "/en/privacy",
  "/en/terms",
  "/en/refund",
  "/en/preview",
  "/en/course",
  "/ar/",
  "/ar/about",
  "/ar/testimonials",
  "/ar/faq",
  "/ar/contact",
  "/ar/pricing",
  "/ar/privacy",
  "/ar/terms",
  "/ar/refund",
  "/ar/preview",
  "/ar/course"
];

const studentRoutes = [
  "/en/dashboard",
  "/en/course",
  "/en/progress",
  "/en/notes",
  "/en/downloads",
  "/en/orders",
  "/en/profile",
  "/en/help",
  "/en/lessons/seed-1",
  "/ar/dashboard",
  "/ar/course",
  "/ar/progress",
  "/ar/notes",
  "/ar/downloads",
  "/ar/orders",
  "/ar/profile",
  "/ar/help",
  "/ar/lessons/seed-1"
];

const adminRoutes = [
  "/en/admin/dashboard",
  "/en/admin/lessons",
  "/en/admin/students",
  "/en/admin/pricing",
  "/en/admin/analytics",
  "/en/admin/orders",
  "/en/admin/media",
  "/en/admin/audit",
  "/en/admin/tickets",
  "/en/admin/settings",
  "/en/admin/notifications",
  "/ar/admin/dashboard",
  "/ar/admin/lessons",
  "/ar/admin/students",
  "/ar/admin/pricing",
  "/ar/admin/analytics",
  "/ar/admin/orders",
  "/ar/admin/media",
  "/ar/admin/audit",
  "/ar/admin/tickets",
  "/ar/admin/settings",
  "/ar/admin/notifications"
];

const adminArabicExpectations = [
  { route: "/ar/admin/dashboard", heading: "لوحة الإدارة" },
  { route: "/ar/admin/lessons", heading: "رفع الدروس" },
  { route: "/ar/admin/students", heading: "إدارة الطلاب" },
  { route: "/ar/admin/pricing", heading: "التسعير والقسائم" },
  { route: "/ar/admin/analytics", heading: "التحليلات والمدفوعات" },
  { route: "/ar/admin/orders", heading: "الطلبات" },
  { route: "/ar/admin/media", heading: "مكتبة الوسائط" },
  { route: "/ar/admin/audit", heading: "سجل التدقيق" },
  { route: "/ar/admin/tickets", heading: "تذاكر الدعم" },
  { route: "/ar/admin/settings", heading: "الإعدادات" },
  { route: "/ar/admin/notifications", heading: "الإشعارات" }
];

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const startIssueTracker = (page: Page) => {
  const issues: string[] = [];

  page.on("pageerror", (error) => {
    issues.push(`pageerror: ${error.message}`);
  });

  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("favicon")) {
      issues.push(`console: ${message.text()}`);
    }
  });

  page.on("requestfailed", (request) => {
    const url = request.url();
    const isCriticalAppRequest = url.includes("/api/v1/") || url.includes("/playlist.m3u8");
    if (!isCriticalAppRequest) {
      return;
    }

    const failure = request.failure();
    const errorText = failure?.errorText ?? "";
    const isNavigationAbort =
      errorText.includes("net::ERR_ABORTED") ||
      errorText.includes("NS_BINDING_ABORTED") ||
      errorText.toLowerCase().includes("cancel");

    if (failure && !isNavigationAbort) {
      issues.push(`request failed: ${request.url()} - ${failure.errorText}`);
    }
  });

  page.on("response", (response) => {
    const url = response.url();
    const status = response.status();
    if (url.includes("favicon.ico")) {
      return;
    }
    const isCriticalAppRequest = url.includes("/api/v1/") || url.includes("/playlist.m3u8");
    if (status >= 500 || (isCriticalAppRequest && status >= 400)) {
      issues.push(`http ${status}: ${url}`);
    }
  });

  return issues;
};

const expectNoCriticalIssues = (issues: string[]) => {
  expect(issues, issues.join("\n")).toEqual([]);
};

const enableDarkMode = async (page: Page) => {
  const html = page.locator("html");
  const toggle = page.getByLabel("Toggle theme");

  await toggle.click();
  if (!(await html.evaluate((element) => element.classList.contains("dark")))) {
    await toggle.click({ force: true });
  }

  await expect(html).toHaveClass(/dark/);
};

const login = async (page: Page, user: { email: string; password: string }) => {
  await page.goto("/en/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/en\/(dashboard|admin\/dashboard)$/, { timeout: 15000 });
};

const getFirstAdminStudentId = async (request: APIRequestContext) => {
  const loginResponse = await request.post("/api/v1/auth/login", { data: adminUser });
  expect(loginResponse.ok(), "admin API login should succeed").toBe(true);
  const loginPayload = (await loginResponse.json()) as { accessToken?: string };
  expect(loginPayload.accessToken, "admin API login should return an access token").toBeTruthy();

  const studentsResponse = await request.get("/api/v1/admin/students?limit=1", {
    headers: { Authorization: `Bearer ${loginPayload.accessToken}` }
  });
  expect(studentsResponse.ok(), "admin students API should return seeded students").toBe(true);
  const studentsPayload = (await studentsResponse.json()) as { data?: Array<{ id: string }> };
  return studentsPayload.data?.[0]?.id ?? null;
};

const expectRouteToLoad = async (page: Page, route: string) => {
  await page.goto(route, { waitUntil: "domcontentloaded" });
  await page
    .waitForFunction(
      () => {
        const text = document.body.innerText;
        return !text.includes("Loading") && !text.includes("Checking your session");
      },
      { timeout: 5000 }
    )
    .catch(() => undefined);
  await page.waitForLoadState("networkidle", { timeout: 2500 }).catch(() => undefined);
  await expect(page).toHaveURL(new RegExp(`${escapeRegExp(route)}$`), { timeout: 15000 });
  await expect(page).not.toHaveURL(/\/login$/, { timeout: 15000 });
};

const supportsHlsPlayback = async (page: Page) =>
  page.evaluate(() => {
    const video = document.createElement("video");
    const hasNativeHls = Boolean(video.canPlayType("application/vnd.apple.mpegurl"));
    const hasMediaSource = "MediaSource" in window && "SourceBuffer" in window;
    return hasNativeHls || hasMediaSource;
  });

const expectVideoPlaybackPath = async (page: Page) => {
  const canPlayHls = await supportsHlsPlayback(page);
  const playlistResponse = canPlayHls
    ? page.waitForResponse(
        (response) => response.url().includes("/playlist.m3u8") && response.status() === 200,
        { timeout: 15000 }
      )
    : null;

  await page.getByRole("button", { name: "Play protected video" }).click();

  if (playlistResponse) {
    await playlistResponse;
    await expect(page.getByTestId("watermark-overlay")).toBeVisible();
  } else {
    await expect(page.getByText("This browser cannot play protected HLS")).toBeVisible();
  }
};

const expectArabicAdminHeading = async (page: Page, heading: string) => {
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  await expect(page.locator("h1").first()).toContainText(/[\u0600-\u06ff]/);
};

test.describe("runtime coverage", () => {
  test.setTimeout(180_000);

  test("public EN/AR routes render and dark mode toggles", async ({ page }) => {
    const issues = startIssueTracker(page);

    for (const route of publicRoutes) {
      await expectRouteToLoad(page, route);

      if (route.startsWith("/ar/")) {
        await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
        await expect(page.locator("html")).toHaveAttribute("lang", "ar");
      }
    }

    await page.goto("/en/", { waitUntil: "domcontentloaded" });
    await enableDarkMode(page);

    expectNoCriticalIssues(issues);
  });

  test("student session survives reloads and keeps locale", async ({ page }) => {
    const issues = startIssueTracker(page);

    await login(page, studentUser);

    await expectRouteToLoad(page, "/en/dashboard");
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(700);
    await expect(page).toHaveURL(/\/en\/dashboard$/);

    await expectRouteToLoad(page, "/ar/dashboard");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByText("روابط سريعة")).toBeVisible();
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(700);
    await expect(page).toHaveURL(/\/ar\/dashboard$/);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

    await expectRouteToLoad(page, "/en/profile");
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(700);
    await expect(page).toHaveURL(/\/en\/profile$/);

    await expectRouteToLoad(page, "/ar/profile");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByText("الملف الشخصي والأمان")).toBeVisible();
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(700);
    await expect(page).toHaveURL(/\/ar\/profile$/);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

    for (const route of ["/en/dashboard", "/ar/dashboard", "/en/lessons/seed-1"]) {
      const freshPage = await page.context().newPage();
      const freshIssues = startIssueTracker(freshPage);
      await expectRouteToLoad(freshPage, route);
      await freshPage.reload({ waitUntil: "domcontentloaded" });
      await freshPage.waitForTimeout(700);
      await expect(freshPage).toHaveURL(new RegExp(`${escapeRegExp(route)}$`));
      await expect(freshPage).not.toHaveURL(/\/login$/);
      if (route.startsWith("/ar/")) {
        await expect(freshPage.locator("html")).toHaveAttribute("dir", "rtl");
        await expect(freshPage.locator("html")).toHaveAttribute("lang", "ar");
      }
      issues.push(...freshIssues);
      await freshPage.close();
    }

    expectNoCriticalIssues(issues);
  });

  test("student route matrix and videos render", async ({ page }) => {
    test.setTimeout(300_000);
    const issues = startIssueTracker(page);

    await login(page, studentUser);

    const sampledStudentRoutes = [
      "/en/dashboard",
      "/en/course",
      "/en/progress",
      "/en/notes",
      "/en/profile",
      "/en/lessons/seed-1",
      "/ar/dashboard",
      "/ar/course",
      "/ar/progress",
      "/ar/notes",
      "/ar/profile",
      "/ar/lessons/seed-1"
    ];

    for (const route of sampledStudentRoutes) {
      await expectRouteToLoad(page, route);
      if (route.startsWith("/ar/")) {
        await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
      }
    }

    await page.goto("/ar/notes", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("ملاحظاتي")).toBeVisible();

    await page.goto("/ar/dashboard", { waitUntil: "domcontentloaded" });
    await enableDarkMode(page);

    await page.goto("/en/preview", { waitUntil: "domcontentloaded" });
    await expectVideoPlaybackPath(page);

    await page.goto("/en/lessons/seed-1", { waitUntil: "domcontentloaded" });
    await expectVideoPlaybackPath(page);

    expectNoCriticalIssues(issues);
  });

  test("admin EN/AR route matrix renders after login", async ({ page, request }) => {
    const issues = startIssueTracker(page);

    const firstStudentId = await getFirstAdminStudentId(request);
    expect(firstStudentId, "seeded student is required for admin student-detail coverage").toBeTruthy();

    // Fetching the seeded student id uses an API login, which would invalidate any existing UI session
    // due to single-session enforcement. Do it first, then perform the UI login for route coverage.
    await login(page, adminUser);

    await expectRouteToLoad(page, "/ar/admin/students");

    const dynamicAdminRoutes = firstStudentId
      ? [...adminRoutes, `/en/admin/students/${firstStudentId}`, `/ar/admin/students/${firstStudentId}`]
      : adminRoutes;

    for (const route of dynamicAdminRoutes) {
      await expectRouteToLoad(page, route);
      if (route.startsWith("/ar/")) {
        await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
      }
    }

    for (const { route, heading } of adminArabicExpectations) {
      await expectRouteToLoad(page, route);
      await expectArabicAdminHeading(page, heading);
    }

    if (firstStudentId) {
      await expectRouteToLoad(page, `/ar/admin/students/${firstStudentId}`);
      await expectArabicAdminHeading(page, "تفاصيل الطالب");
    }

    expectNoCriticalIssues(issues);
  });

  test("mobile sweep has no horizontal overflow on key public and student pages", async ({ page }) => {
    const issues = startIssueTracker(page);

    await page.setViewportSize({ width: 390, height: 844 });

    for (const route of ["/en/", "/ar/", "/en/login", "/ar/login"]) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(300);
      const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(hasOverflow, `overflow on ${route}`).toBe(false);
    }

    await login(page, studentUser);

    for (const route of ["/en/dashboard", "/en/course", "/en/profile", "/ar/dashboard", "/ar/course", "/ar/profile"]) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(400);
      const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(hasOverflow, `overflow on ${route}`).toBe(false);
      if (route.startsWith("/ar/")) {
        await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
      }
    }

    expectNoCriticalIssues(issues);
  });
});
