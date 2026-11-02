const express = require("express");
const createAuthenticate = require("../../middleware/authenticate");
const requirePermission = require("../../middleware/authorize");
const createVerifyOrigin = require("../../middleware/verifyOrigin");

function requireAnyPermission(...permissions) {
  return function authorizeAny(req, res, next) {
    if (req.auth.roles.includes("Super Admin") || permissions.some((permission) => req.auth.permissions.includes(permission))) {
      return next();
    }
    return requirePermission(permissions[0])(req, res, next);
  };
}

function createAccessRoutes(controller, authService, config) {
  const router = express.Router();
  const authenticate = createAuthenticate(authService, config.sessionCookieName);
  const verifyOrigin = createVerifyOrigin(config.frontendOrigin);
  const manageUsers = requirePermission("users.manage");
  const manageRoles = requirePermission("roles.manage");
  const managePermissions = requirePermission("permissions.manage");

  router.get("/users", authenticate, manageUsers, controller.listUsers);
  router.post("/users", authenticate, verifyOrigin, manageUsers, controller.createUser);
  router.patch("/users/:id", authenticate, verifyOrigin, manageUsers, controller.updateUser);
  router.post("/users/:id/password", authenticate, verifyOrigin, manageUsers, controller.setUserPassword);
  router.get("/roles", authenticate, requireAnyPermission("roles.manage", "users.manage"), controller.listRoles);
  router.post("/roles", authenticate, verifyOrigin, manageRoles, controller.createRole);
  router.patch("/roles/:id", authenticate, verifyOrigin, manageRoles, controller.updateRole);
  router.put("/roles/:id/permissions", authenticate, verifyOrigin, manageRoles, controller.setRolePermissions);
  router.get("/permissions", authenticate, requireAnyPermission("permissions.manage", "roles.manage"), controller.listPermissions);
  router.post("/permissions", authenticate, verifyOrigin, managePermissions, controller.createPermission);
  router.get("/audit-logs", authenticate, requirePermission("audit.read"), controller.listAuditLogs);

  return router;
}

module.exports = createAccessRoutes;
