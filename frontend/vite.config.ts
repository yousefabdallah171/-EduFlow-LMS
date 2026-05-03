/// <reference types="vitest" />

import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PUBLIC_ROUTES = [
  "/",
  "/pricing",
  "/about",
  "/faq",
  "/contact",
  "/testimonials",
  "/roadmap",
  "/preview",
  "/privacy",
  "/terms",
  "/refund",
];

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || "http://127.0.0.1:3000";
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const isProd = mode === "production";

  return {
    plugins: [
      react({
        jsxImportSource: "react"
      })
    ],
    server: {
      watch: {
        usePolling: true,
        interval: 300
      },
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true
        }
      }
    },
    resolve: {
      alias: {
        "@": path.resolve(currentDir, "./src")
      }
    },
    build: {
      chunkSizeWarningLimit: 600,
      minify: "terser",
      terserOptions: {
        compress: {
          drop_console: isProd,
          drop_debugger: isProd
        }
      },
      rollupOptions: {
        output: {
          manualChunks: {
            react: ["react", "react-dom", "react-router-dom"],
            query: ["@tanstack/react-query", "axios", "zustand"],
            i18n: ["i18next", "react-i18next", "i18next-browser-languagedetector"],
            ui: ["@headlessui/react", "@floating-ui/react", "lucide-react"],
            hls: ["hls.js"]
          }
        }
      }
    },
    test: {
      exclude: ["node_modules", "dist", "tests/e2e/**"],
      environment: "jsdom",
      passWithNoTests: true,
      setupFiles: ["./tests/setup.ts"]
    }
  };
});
