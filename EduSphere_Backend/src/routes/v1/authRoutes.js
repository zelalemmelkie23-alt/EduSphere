const express = require("express");
const createAuthenticate = require("../../middleware/authenticate");
const createVerifyOrigin = require("../../middleware/verifyOrigin");
const createLoginRateLimit = require("../../middleware/loginRateLimit");

function createAuthRoutes(controller, authService, config) {
  const router = express.Router();
  const authenticate = createAuthenticate(authService, config.sessionCookieName);
  const verifyOrigin = createVerifyOrigin(config.frontendOrigin);
  const loginRateLimit = createLoginRateLimit({
    onLimited: (request) => authService.recordLoginRateLimit(request)
  });

  router.post("/auth/login", verifyOrigin, loginRateLimit, controller.login);
  router.post("/auth/logout", verifyOrigin, authenticate, controller.logout);
  router.get("/auth/me", authenticate, controller.me);
  router.post("/auth/change-password", verifyOrigin, authenticate, controller.changePassword);

  return router;
}

module.exports = createAuthRoutes;
