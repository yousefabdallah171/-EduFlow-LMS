import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["node_modules", "dist"],
    globalSetup: ["./tests/setup/vitest.global.ts"],
    hookTimeout: 30_000,
    fileParallelism: false,
    coverage: {
      enabled: process.env.COVERAGE === "true",
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.d.ts",
        "src/**/index.ts",
        "src/**/*.config.ts",
        "src/app.ts",
        "src/server.ts"
      ],
      lines: 70,
      functions: 70,
      branches: 60,
      statements: 70
    }
  }
});
