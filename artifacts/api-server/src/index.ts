import { createApp } from "./app";
import { logger } from "./lib/logger";
import { env } from "./config/env";

const app = createApp();

app.listen(env.PORT, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port: env.PORT, env: env.NODE_ENV }, "API server listening");
});
