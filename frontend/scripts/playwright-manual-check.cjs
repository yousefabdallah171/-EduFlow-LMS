const { chromium } = require("playwright");

const baseUrl = process.env.BASE_URL || "http://localhost:5173";
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;
const studentEmail = process.env.STUDENT_EMAIL;
const studentPassword = process.env.STUDENT_PASSWORD;
const locale = process.env.LOCALE || "ar";

if (!adminEmail || !adminPassword || !studentEmail || !studentPassword) {
  console.error("Missing ADMIN_EMAIL/ADMIN_PASSWORD/STUDENT_EMAIL/STUDENT_PASSWORD env vars.");
  process.exit(1);
}

const url = (path) => `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

const captureConsole = (page, bucket) => {
  const onConsole = (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") {
      bucket.push({
        type: msg.type(),
        text: msg.text(),
        location: msg.location()
      });
    }
  };
  const onPageError = (error) => {
    bucket.push({
      type: "pageerror",
      text: error.message
    });
  };
  const onResponse = (response) => {
    const status = response.status();
    if (status >= 400 && response.url().includes("/api/v1")) {
      bucket.push({
        type: "network",
        text: `${status} ${response.url()}`
      });
    }
  };
  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  page.on("response", onResponse);
  return () => {
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
    page.off("response", onResponse);
  };
};

const login = async (page, email, password, expectedPath) => {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    await page.goto(url(`/${locale}/login`), { waitUntil: "networkidle" });
    await page.fill("#email", email);
    await page.fill("#password", password);
    const [loginResponse] = await Promise.all([
      page.waitForResponse((response) => response.url().includes("/api/v1/auth/login")),
      page.click("button:has-text(\"Log in\")")
    ]);
    const status = loginResponse.status();
    if (status === 429 && attempt < 4) {
      await page.waitForTimeout(10000 * attempt);
      continue;
    }
    if (status >= 400) {
      const body = await loginResponse.text();
      throw new Error(`Login failed with status ${status}. Response: ${body.slice(0, 200)}`);
    }
    await page.waitForLoadState("networkidle");
    if (expectedPath) {
      await page.waitForTimeout(300);
      const current = page.url();
      if (!current.includes(expectedPath)) {
        throw new Error(`Login failed or redirect missing. Expected path ${expectedPath}, got ${current}`);
      }
    }
    return;
  }
};

const run = async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const results = [];

  const checkPage = async (label, targetUrl, options = {}) => {
    const { rtl = true, dark = false, extraChecks } = options;
    const errors = [];
    const detach = captureConsole(page, errors);
    await page.goto(targetUrl, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    if (rtl) {
      const rtlState = await page.evaluate(() => ({
        dir: document.documentElement.dir,
        lang: document.documentElement.lang
      }));
      if (rtlState.dir !== "rtl" || rtlState.lang !== "ar") {
        errors.push({ type: "assert", text: `RTL/lang mismatch: dir=${rtlState.dir} lang=${rtlState.lang}` });
      }
    }
    if (dark) {
      const darkState = await page.evaluate(() => ({
        hasDark: document.documentElement.classList.contains("dark"),
        bodyBg: getComputedStyle(document.body).backgroundColor
      }));
      if (!darkState.hasDark) {
        errors.push({ type: "assert", text: "Dark mode class missing on <html>." });
      }
      if (darkState.bodyBg === "rgb(255, 255, 255)") {
        errors.push({ type: "assert", text: "Body background still white in dark mode." });
      }
    }
    if (extraChecks) {
      await extraChecks(errors);
    }
    detach();
    results.push({ label, url: targetUrl, errors });
  };

  await checkPage("landing-ar", url(`/${locale}`));
  await checkPage("login-ar", url(`/${locale}/login`));
  await checkPage("register-ar", url(`/${locale}/register`));
  await checkPage("forgot-password-ar", url(`/${locale}/forgot-password`));

  await login(page, adminEmail, adminPassword, "/admin");
  await checkPage("admin-dashboard", url(`/${locale}/admin/dashboard`));
  await checkPage("admin-students", url(`/${locale}/admin/students`));
  await checkPage("admin-lessons", url(`/${locale}/admin/lessons`));
  await checkPage("admin-pricing", url(`/${locale}/admin/pricing`));
  await checkPage("admin-analytics", url(`/${locale}/admin/analytics`));

  const ensureDark = async () => {
    const hasDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    if (!hasDark) {
      await page.click("[aria-label=\"Toggle theme\"]");
      await page.waitForTimeout(200);
    }
  };

  await ensureDark();
  await checkPage("admin-dashboard-dark", url(`/${locale}/admin/dashboard`), { dark: true });
  await checkPage("admin-students-dark", url(`/${locale}/admin/students`), { dark: true });
  await checkPage("admin-lessons-dark", url(`/${locale}/admin/lessons`), { dark: true });
  await checkPage("admin-pricing-dark", url(`/${locale}/admin/pricing`), { dark: true });
  await checkPage("admin-analytics-dark", url(`/${locale}/admin/analytics`), { dark: true });

  await page.context().clearCookies();
  await login(page, studentEmail, studentPassword, "/course");

  await checkPage("student-course", url(`/${locale}/course`));
  await checkPage("student-checkout", url(`/${locale}/checkout`));
  await checkPage("student-lesson", url(`/${locale}/lessons/seed-2`), {
    extraChecks: async (errors) => {
    const playButton = await page.$("button:has-text(\"Play protected video\")");
    if (playButton) {
      await playButton.click();
      await page.waitForTimeout(500);
    }
    const info = await page.evaluate(() => {
      const video = document.querySelector("video");
      const anchors = Array.from(document.querySelectorAll("a"))
        .map((node) => node.getAttribute("href"))
        .filter(Boolean);
      const mainText = document.querySelector("main")?.innerText || document.body.innerText || "";
      return {
        hasVideo: Boolean(video),
        videoSrc: video?.getAttribute("src") || "",
        videoCurrentSrc: video?.currentSrc || "",
        videoSourceTag: video?.querySelector("source")?.getAttribute("src") || "",
        mp4Links: anchors.filter((href) => href.endsWith(".mp4")),
        mainText
      };
    });
    if (!info.hasVideo) {
      errors.push({ type: "assert", text: `Video element not found. Main text: ${info.mainText.slice(0, 200)}` });
    }
    if (info.videoSrc.includes(".mp4") || info.videoCurrentSrc.includes(".mp4")) {
      errors.push({ type: "assert", text: "Video appears to be an MP4 source." });
    }
    if (
      !info.videoCurrentSrc.includes(".m3u8") &&
      !info.videoSourceTag.includes(".m3u8") &&
      !info.videoCurrentSrc.includes("/api/v1/video/") &&
      !info.videoSrc.includes("/api/v1/video/")
    ) {
      errors.push({ type: "assert", text: "Video source does not look like HLS." });
    }
    if (info.mp4Links.length > 0) {
      errors.push({ type: "assert", text: `Found MP4 links: ${info.mp4Links.join(", ")}` });
    }
  }});

  await checkPage("student-video-hls", url(`/${locale}/lessons/seed-2`), {
    extraChecks: async (errors) => {
    const playback = await page.evaluate(async () => {
      const refreshResponse = await fetch("/api/v1/auth/refresh", {
        method: "POST",
        credentials: "include"
      });
      if (!refreshResponse.ok) {
        return { lessonStatus: refreshResponse.status, hlsOk: false, hlsText: "" };
      }
      const refreshJson = await refreshResponse.json();
      const accessToken = refreshJson?.accessToken;
      const lessonResponse = await fetch("/api/v1/lessons/seed-2", {
        headers: { Authorization: `Bearer ${accessToken}` },
        credentials: "include"
      });
      const lessonJson = await lessonResponse.json().catch(() => null);
      const hlsUrl = lessonJson?.hlsUrl;
      if (!hlsUrl) {
        return { lessonStatus: lessonResponse.status, hlsOk: false, hlsText: "" };
      }
      const playlistResponse = await fetch(hlsUrl, { credentials: "include" });
      const playlistText = await playlistResponse.text();
      return {
        lessonStatus: lessonResponse.status,
        hlsOk: playlistResponse.ok,
        hlsText: playlistText.slice(0, 200),
        hlsUrl
      };
    });
    if (playback.lessonStatus >= 400) {
      errors.push({ type: "assert", text: `Lesson playback API failed with ${playback.lessonStatus}.` });
    }
    if (!playback.hlsOk || !playback.hlsText.includes("#EXTM3U")) {
      errors.push({ type: "assert", text: `HLS playlist missing or invalid: ${playback.hlsText}` });
    }
  }});

  await ensureDark();
  await checkPage("student-course-dark", url(`/${locale}/course`), { dark: true });
  await checkPage("student-lesson-dark", url(`/${locale}/lessons/seed-2`), { dark: true });

  const hlsUrl = await page.evaluate(async () => {
    const refreshResponse = await fetch("/api/v1/auth/refresh", {
      method: "POST",
      credentials: "include"
    });
    if (!refreshResponse.ok) {
      return null;
    }
    const refreshJson = await refreshResponse.json();
    const accessToken = refreshJson?.accessToken;
    const lessonResponse = await fetch("/api/v1/lessons/seed-2", {
      headers: { Authorization: `Bearer ${accessToken}` },
      credentials: "include"
    });
    const data = await lessonResponse.json().catch(() => null);
    return data?.hlsUrl || null;
  });
  if (hlsUrl) {
    const unauth = await browser.newContext();
    const unauthPage = await unauth.newPage();
    const resp = await unauthPage.goto(`${baseUrl}${hlsUrl}`, { waitUntil: "networkidle" });
    const status = resp?.status() ?? 0;
    results.push({
      label: "hls-no-cookie",
      url: `${baseUrl}${hlsUrl}`,
      errors: status === 401 ? [] : [{ type: "assert", text: `Expected 401 without cookies, got ${status}.` }]
    });
    await unauth.close();
  } else {
    results.push({
      label: "hls-no-cookie",
      url: "missing-hls-url",
      errors: [{ type: "assert", text: "HLS URL missing from lesson API." }]
    });
  }

  await browser.close();

  console.log(JSON.stringify({ baseUrl, locale, results }, null, 2));
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
