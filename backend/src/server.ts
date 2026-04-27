import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { initSentry } from "./observability/sentry.js";
import { closeAllQueues } from "./jobs/job-queue.js";

initSentry();

const app = createApp();

const server = app.listen(env.BACKEND_PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`EduFlow LMS backend listening on ${env.BACKEND_PORT}`);
});

// Graceful shutdown handlers
const gracefulShutdown = async (signal: string) => {
  // eslint-disable-next-line no-console
  console.log(`[Server] Received ${signal}, starting graceful shutdown...`);

  await closeAllQueues();
  server.close(() => {
    // eslint-disable-next-line no-console
    console.log("[Server] Gracefully shut down");
    process.exit(0);
  });
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
