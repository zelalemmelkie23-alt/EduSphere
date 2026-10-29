const express = require("express");
const cors = require("cors");
const config = require("./config/env");
const createHealthController = require("./controllers/healthController");
const createErrorHandler = require("./middleware/errorHandler");
const notFound = require("./middleware/notFound");
const createHealthRepository = require("./repositories/healthRepository");
const createHealthRoutes = require("./routes/v1/healthRoutes");
const createHealthService = require("./services/healthService");

function createApp({ database = require("./config/database"), logger = console } = {}) {
  const app = express();
  const healthController = createHealthController(
    createHealthService(createHealthRepository(database))
  );

  app.disable("x-powered-by");
  app.use(cors({ origin: config.frontendOrigin }));
  app.use(express.json({ limit: "1mb" }));
  app.use("/api/v1", createHealthRoutes(healthController));
  app.get("/api/health", healthController);
  app.use(notFound);
  app.use(createErrorHandler(logger));

  return app;
}

module.exports = createApp;
