import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["node_modules", "dist"],
    globalSetup: ["./tests/setup/vitest.global.ts"],
    hookTimeout: 30_000,
    fileParallelism: false
  }
});
