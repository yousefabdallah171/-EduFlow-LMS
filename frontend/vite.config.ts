import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || "http://backend:3000";

  return {
    plugins: [react()],
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
        "@": path.resolve(__dirname, "./src")
      }
    },
    build: {
      chunkSizeWarningLimit: 600,
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
    }
  };
});
