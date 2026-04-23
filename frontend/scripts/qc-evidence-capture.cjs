const path = require("node:path");
const fs = require("node:fs");
const { chromium } = require("playwright");

const baseUrl = process.env.BASE_URL || "http://localhost:5173";
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;
const studentEmail = process.env.STUDENT_EMAIL;
const studentPassword = process.env.STUDENT_PASSWORD;
const locale = process.env.LOCALE || "en";
const evidenceDate = process.env.EVIDENCE_DATE || new Date().toISOString().slice(0, 10);

if (!adminEmail || !adminPassword || !studentEmail || !studentPassword) {
  // eslint-disable-next-line no-console
  console.error("Missing ADMIN_EMAIL/ADMIN_PASSWORD/STUDENT_EMAIL/STUDENT_PASSWORD env vars.");
  process.exit(1);
}

const url = (p) => `${baseUrl}${p.startsWith("/") ? p : `/${p}`}`;

const ensureDir = (dir) => {
  fs.mkdirSync(dir, { recursive: true });
};

const outRoot = path.resolve(process.cwd(), "..", "docs", "evidence", evidenceDate);
const outShots = path.join(outRoot, "screenshots");
ensureDir(outShots);

const writeJson = (name, data) => {
  fs.writeFileSync(path.join(outRoot, name), JSON.stringify(data, null, 2), "utf8");
};

const loginUi = async (page, email, password) => {
  await page.goto(url(`/${locale}/login`), { waitUntil: "networkidle" });
  const emailInput = page.locator("#email");
  const passwordInput = page.locator("#password");
  if (await emailInput.count()) {
    await emailInput.fill(email);
  } else {
    await page.getByLabel(/email/i).fill(email);
  }
  if (await passwordInput.count()) {
    await passwordInput.fill(password);
  } else {
    await page.getByLabel(/password/i).fill(password);
  }
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/v1/auth/login"), { timeout: 15000 }),
    page.locator('button[type="submit"]').click()
  ]);
  if (!resp.ok()) {
    const body = await resp.text().catch(() => "");
    throw new Error(`Login failed: ${resp.status()} ${body.slice(0, 200)}`);
  }
  await page.waitForLoadState("networkidle");
};

const fetchWithCookies = async (context, fetchUrl) => {
  const cookies = await context.cookies();
  const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
  const res = await fetch(fetchUrl, {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined
  });
  return { status: res.status, text: await res.text() };
};

const redactTokenParam = (value) => String(value || "").replace(/token=[A-Za-z0-9._-]+/g, "token=<redacted>");

const run = async () => {
  const browser = await chromium.launch({ headless: true, executablePath: executablePath || undefined });

  // --- Guest preview page (CTA banner visible) ---
  const guest = await browser.newContext();
  const guestPage = await guest.newPage();
  await guestPage.goto(url(`/${locale}/preview`), { waitUntil: "networkidle" });
  await guestPage.waitForTimeout(750);
  await guestPage.screenshot({ path: path.join(outShots, "preview-page.png"), fullPage: true });
  await guest.close();

  // --- Student lesson (watermark visible) ---
  const student = await browser.newContext();
  const studentPage = await student.newPage();
  await loginUi(studentPage, studentEmail, studentPassword);
  await studentPage.goto(url(`/${locale}/lessons/seed-2`), { waitUntil: "networkidle" });
  await studentPage.waitForTimeout(1000);
  await studentPage.screenshot({ path: path.join(outShots, "student-lesson.png"), fullPage: true });
  await student.close();

  // --- Admin pages (sanity) ---
  const admin = await browser.newContext();
  const adminPage = await admin.newPage();
  await loginUi(adminPage, adminEmail, adminPassword);
  await adminPage.goto(url(`/${locale}/admin/dashboard`), { waitUntil: "networkidle" });
  await adminPage.waitForTimeout(750);
  await adminPage.screenshot({ path: path.join(outShots, "admin-dashboard.png"), fullPage: true });
  await admin.close();

  // --- Incognito replay: capture an HLS URL and verify it fails without cookies ---
  // Use a temporary logged-in context to fetch the lesson JSON and get the HLS URL.
  const temp = await browser.newContext();
  const tempPage = await temp.newPage();
  await loginUi(tempPage, studentEmail, studentPassword);
  const lessonJson = await tempPage.evaluate(async () => {
    const refresh = await fetch("/api/v1/auth/refresh", { method: "POST", credentials: "include" });
    if (!refresh.ok) return { ok: false, status: refresh.status };
    const { accessToken } = await refresh.json();
    const lesson = await fetch("/api/v1/lessons/seed-2", {
      headers: { Authorization: `Bearer ${accessToken}` },
      credentials: "include"
    });
    const data = await lesson.json().catch(() => null);
    return { ok: lesson.ok, status: lesson.status, hlsUrl: data?.hlsUrl || null };
  });
  const hlsUrl = lessonJson?.hlsUrl;
  let incognitoStatus = null;
  if (hlsUrl) {
    const incognito = await browser.newContext();
    const { status } = await fetchWithCookies(incognito, url(hlsUrl));
    incognitoStatus = status;
    await incognito.close();
  }
  await temp.close();

  writeJson("qc-screenshots.json", {
    evidenceDate,
    baseUrl,
    locale,
    screenshots: [
      "screenshots/preview-page.png",
      "screenshots/student-lesson.png",
      "screenshots/admin-dashboard.png"
    ],
    incognitoReplay: {
      hlsUrl: hlsUrl ? redactTokenParam(url(hlsUrl)) : null,
      status: incognitoStatus
    }
  });

  await browser.close();
  // eslint-disable-next-line no-console
  console.log(`Wrote ${path.join(outRoot, "qc-screenshots.json")}`);
};

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
