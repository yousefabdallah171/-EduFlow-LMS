import fs from "node:fs";
import { defineConfig } from "@playwright/test";

const chromiumPath =
  process.env.PLAYWRIGHT_CHROMIUM_PATH ??
  (fs.existsSync("/usr/bin/chromium-browser") ? "/usr/bin/chromium-browser" : "/usr/bin/chromium");

export default defineConfig({
  reporter: "list",
  workers: 1,
  use: {
    browserName: "chromium",
    launchOptions: {
      executablePath: chromiumPath,
      args: ["--no-sandbox"]
    }
  }
});
