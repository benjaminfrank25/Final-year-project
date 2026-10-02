import app from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";
import { log } from "./utils/logger";

async function start() {
  try {
    await connectDB();
    app.listen(env.PORT, () => {
      log.success(`Server running on http://localhost:${env.PORT}`);
    });
  } catch (err) {
    log.error("Failed to start server", err);
    process.exit(1);
  }
}

start();
