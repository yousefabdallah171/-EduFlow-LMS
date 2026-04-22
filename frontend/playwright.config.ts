import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";

export default defineConfig({
  testDir: "./tests/e2e",
  workers: process.env.PW_WORKERS ? Number(process.env.PW_WORKERS) : 1,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173",
    screenshot: "only-on-failure"
  },
  projects: (() => {
    const isAlpine = fs.existsSync("/etc/alpine-release");
    const allBrowsers = process.env.PW_ALL_BROWSERS === "1";
    const chromiumExecutablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH ?? (isAlpine ? "/usr/bin/chromium" : undefined);

    const chromiumProject = {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: chromiumExecutablePath ? { executablePath: chromiumExecutablePath } : undefined
      }
    } as const;

    if (isAlpine && !allBrowsers) {
      return [chromiumProject];
    }

    if (!allBrowsers) {
      return [chromiumProject];
    }

    return [
      chromiumProject,
      {
        name: "firefox",
        use: { ...devices["Desktop Firefox"] }
      },
      {
        name: "webkit",
        use: { ...devices["Desktop Safari"] }
      }
    ];
  })()
});
