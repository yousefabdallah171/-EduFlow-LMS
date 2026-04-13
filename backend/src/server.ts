import { createApp } from "./app.js";
import { env } from "./config/env.js";

const app = createApp();

app.listen(env.BACKEND_PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`EduFlow backend listening on ${env.BACKEND_PORT}`);
});
