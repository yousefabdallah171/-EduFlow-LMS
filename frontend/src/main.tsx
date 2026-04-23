import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import { Toaster } from "sonner";

import App from "./App";
import { queryClient } from "@/lib/api";
import i18n from "@/lib/i18n";
import { initFrontendSentry } from "./observability/sentry";
import { registerServiceWorker } from "./service-worker";
import "@/styles/globals.css";

initFrontendSentry();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster richColors />
      </QueryClientProvider>
    </I18nextProvider>
  </React.StrictMode>
);

registerServiceWorker();
