const createApp = require("./app");
const config = require("./config/env");
const database = require("./config/database");

const server = createApp().listen(config.port, () => {
  console.log(`School API listening on port ${config.port} (${config.environment}).`);
});

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received; shutting down.`);

  server.close(async (error) => {
    if (error) {
      console.error("API server shutdown failed:", error);
      process.exitCode = 1;
    }

    try {
      await database.end();
    } catch (databaseError) {
      console.error("Database pool shutdown failed:", databaseError);
      process.exitCode = 1;
    }
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
