const express = require("express");
const cors = require("cors");
const config = require("./config/env");
const createHealthController = require("./controllers/healthController");
const createErrorHandler = require("./middleware/errorHandler");
const notFound = require("./middleware/notFound");
const createAuthController = require("./controllers/authController");
const createAccessController = require("./controllers/accessController");
const createAuthRepository = require("./repositories/authRepository");
const createAuthService = require("./services/authService");
const createAuthRoutes = require("./routes/v1/authRoutes");
const createAccessRoutes = require("./routes/v1/accessRoutes");
const createHealthRepository = require("./repositories/healthRepository");
const createHealthRoutes = require("./routes/v1/healthRoutes");
const createHealthService = require("./services/healthService");

function createApp({
  database = require("./config/database"),
  authRepository,
  logger = console,
  appConfig = config
} = {}) {
  const app = express();
  const resolvedAuthRepository = authRepository || createAuthRepository(database);
  const authService = createAuthService(resolvedAuthRepository);
  const authController = createAuthController(authService, {
    cookieName: appConfig.sessionCookieName,
    secureCookie: appConfig.secureSessionCookie
  });
  const healthController = createHealthController(
    createHealthService(createHealthRepository(database))
  );

  app.disable("x-powered-by");
  app.use(cors({ origin: appConfig.frontendOrigin, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use("/api/v1", createAuthRoutes(
    authController,
    authService,
    appConfig
  ));
  app.use("/api/v1", createAccessRoutes(
    createAccessController(authService, authController.clearSessionCookie),
    authService,
    appConfig
  ));
  app.use("/api/v1", createHealthRoutes(healthController));
  app.get("/api/health", healthController);
  app.use(notFound);
  app.use(createErrorHandler(logger));

  return app;
}

module.exports = createApp;
