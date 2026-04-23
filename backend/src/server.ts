import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { initSentry } from "./observability/sentry.js";

initSentry();

const app = createApp();

app.listen(env.BACKEND_PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`AI Workflow backend listening on ${env.BACKEND_PORT}`);
});
