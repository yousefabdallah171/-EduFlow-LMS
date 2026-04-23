import * as Sentry from "@sentry/react";

const dsn = (import.meta.env.VITE_SENTRY_DSN ?? "").trim();

export const initFrontendSentry = () => {
  if (!dsn) return;

  const environment = import.meta.env.VITE_SENTRY_ENVIRONMENT ?? import.meta.env.MODE;
  const release = import.meta.env.VITE_SENTRY_RELEASE;
  const tracesSampleRateRaw = import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE;
  const tracesSampleRate = tracesSampleRateRaw ? Number(tracesSampleRateRaw) : undefined;

  Sentry.init({
    dsn,
    environment,
    release,
    tracesSampleRate
  });
};

