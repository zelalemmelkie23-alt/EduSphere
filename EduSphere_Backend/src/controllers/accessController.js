const AppError = require("../errors/AppError");

function positiveId(value, label) {
  if (!/^[1-9]\d*$/.test(value || "")) {
    throw new AppError(400, "INVALID_ID", `${label} must be a positive integer.`);
  }
  const id = Number(value);
  if (!Number.isSafeInteger(id)) throw new AppError(400, "INVALID_ID", `${label} must be a positive integer.`);
  return id;
}

function pagination(query) {
  const limit = query.limit === undefined ? 50 : Number(query.limit);
  const offset = query.offset === undefined ? 0 : Number(query.offset);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(offset) || offset < 0) {
    throw new AppError(400, "INVALID_PAGINATION", "Limit must be 1-100 and offset must be a non-negative integer.");
  }
  return { limit, offset };
}

function createAccessController(authService, clearSessionCookie) {
  function requestInfo(req) {
    return {
      ipAddress: req.ip,
      requestId: req.get("x-request-id")?.slice(0, 100) || null
    };
  }

  return {
    async listUsers(req, res) {
      const { limit, offset } = pagination(req.query);
      const users = await authService.listUsers(limit, offset);
      res.status(200).json({ data: { users } });
    },

    async createUser(req, res) {
      const user = await authService.createUser(req.body || {}, req.auth, requestInfo(req));
      res.status(201).json({ message: "User created.", data: { user } });
    },

    async updateUser(req, res) {
      const id = positiveId(req.params.id, "User ID");
      const user = await authService.updateUser(id, req.body || {}, req.auth, requestInfo(req));
      res.status(200).json({ message: "User updated.", data: { user } });
    },

    async setUserPassword(req, res) {
      const id = positiveId(req.params.id, "User ID");
      await authService.setUserPassword(id, req.body?.password, req.auth, requestInfo(req));
      if (id === req.auth.id) clearSessionCookie(res);
      res.status(200).json({ message: "User password updated." });
    },

    async listRoles(req, res) {
      const roles = await authService.listRoles();
      res.status(200).json({ data: { roles } });
    },

    async createRole(req, res) {
      const role = await authService.createRole(req.body || {}, req.auth, requestInfo(req));
      res.status(201).json({ message: "Role created.", data: { role } });
    },

    async updateRole(req, res) {
      const id = positiveId(req.params.id, "Role ID");
      const role = await authService.updateRole(id, req.body || {}, req.auth, requestInfo(req));
      res.status(200).json({ message: "Role updated.", data: { role } });
    },

    async listPermissions(req, res) {
      const permissions = await authService.listPermissions();
      res.status(200).json({ data: { permissions } });
    },

    async createPermission(req, res) {
      const permission = await authService.createPermission(req.body || {}, req.auth, requestInfo(req));
      res.status(201).json({ message: "Permission created.", data: { permission } });
    },

    async setRolePermissions(req, res) {
      const id = positiveId(req.params.id, "Role ID");
      const permissionIds = req.body?.permissionIds;
      const assigned = await authService.setRolePermissions(id, permissionIds, req.auth, requestInfo(req));
      res.status(200).json({ message: "Role permissions updated.", data: { permissionIds: assigned } });
    },

    async listAuditLogs(req, res) {
      const { limit, offset } = pagination(req.query);
      const logs = await authService.listAuditLogs(limit, offset);
      res.status(200).json({ data: { logs } });
    }
  };
}

module.exports = createAccessController;
