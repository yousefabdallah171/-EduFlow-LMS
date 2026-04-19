import fs from "node:fs";
import { defineConfig } from "@playwright/test";

const chromiumPath =
  process.env.PLAYWRIGHT_CHROMIUM_PATH ??
  (fs.existsSync("/usr/bin/chromium-browser") ? "/usr/bin/chromium-browser" : "/usr/bin/chromium");

export default defineConfig({
  reporter: "list",
  testDir: "./tests/e2e",
  workers: 1,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173",
    browserName: "chromium",
    launchOptions: {
      executablePath: chromiumPath,
      args: ["--no-sandbox"]
    }
  }
});
