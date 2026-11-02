const bcrypt = require("bcryptjs");
const AppError = require("../errors/AppError");
const { createSessionToken, hashSessionToken } = require("../utils/session");

const BCRYPT_ROUNDS = 12;
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const DUMMY_HASH = "$2b$12$co8GhFd8HqxdDWw.q02at.XgRRSDCRft1.8cn3tBjtM3y0WicQHwm";

function validateIds(ids, code, label) {
  if (!Array.isArray(ids) || ids.some((id) => !Number.isSafeInteger(id) || id <= 0) || new Set(ids).size !== ids.length) {
    throw new AppError(400, code, `${label} must be an array of unique positive integers.`);
  }
}

function validatePassword(password) {
  if (typeof password !== "string" || password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
    throw new AppError(400, "INVALID_PASSWORD", "Passwords must be at least 12 characters and no more than 72 bytes.");
  }
}

function requireString(value, label, maxLength) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > maxLength) {
    throw new AppError(400, "INVALID_INPUT", `${label} is required and must be no more than ${maxLength} characters.`);
  }
  return value.trim();
}

function ensureUniqueError(error, entity) {
  if (error.code === "ER_DUP_ENTRY") {
    throw new AppError(409, `${entity.toUpperCase()}_ALREADY_EXISTS`, `A ${entity} with that value already exists.`);
  }
  throw error;
}

function createAuthService(repository) {
  return {
    async login({ email, password, ipAddress, userAgent, requestId }) {
      if (typeof email !== "string" || typeof password !== "string") {
        await repository.writeAudit({
          action: "auth.login.failed",
          entityType: "authentication",
          summary: { reason: "invalid_credentials" },
          ipAddress,
          requestId
        });
        throw new AppError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
      }

      const normalizedEmail = email.trim().toLowerCase();
      const user = await repository.findUserByEmail(normalizedEmail);
      const passwordMatches = await bcrypt.compare(password, user?.password_hash || DUMMY_HASH);
      if (!user || !user.is_active || !passwordMatches) {
        await repository.writeAudit({
          action: "auth.login.failed",
          entityType: "authentication",
          summary: { reason: "invalid_credentials" },
          ipAddress,
          requestId
        });
        throw new AppError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
      }

      const token = createSessionToken();
      const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
      await repository.createAuthenticatedSession({
        userId: Number(user.id),
        tokenHash: hashSessionToken(token),
        expiresAt,
        ipAddress,
        userAgent: userAgent?.slice(0, 500) || null,
        audit: {
          actorUserId: Number(user.id),
          action: "auth.login.succeeded",
          entityType: "authentication",
          entityId: Number(user.id),
          summary: {},
          ipAddress,
          requestId
        }
      });

      return {
        token,
        expiresAt,
        user: await repository.getIdentityById(Number(user.id))
      };
    },

    async logout(tokenHash, user, request) {
      await repository.deleteSession(tokenHash);
      await repository.writeAudit({
        actorUserId: user.id,
        action: "auth.logout",
        entityType: "authentication",
        entityId: user.id,
        ipAddress: request.ipAddress,
        requestId: request.requestId
      });
    },

    async getSession(tokenHash) {
      const identity = await repository.findSession(tokenHash);
      if (!identity) {
        throw new AppError(401, "UNAUTHENTICATED", "Authentication is required.");
      }
      return identity;
    },

    async recordLoginRateLimit({ ipAddress, requestId }) {
      await repository.writeAudit({
        action: "auth.login.rate_limited",
        entityType: "authentication",
        summary: { reason: "rate_limit" },
        ipAddress,
        requestId
      });
    },

    async changePassword({ user, currentPassword, newPassword, ipAddress, requestId }) {
      validatePassword(newPassword);
      const record = await repository.findUserByEmail(user.email);
      if (!record || !await bcrypt.compare(currentPassword || "", record.password_hash)) {
        throw new AppError(400, "CURRENT_PASSWORD_INVALID", "The current password is incorrect.");
      }
      const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
      await repository.updateUser(user.id, { passwordHash }, user.id, {
        action: "auth.password.changed",
        summary: {},
        ipAddress,
        requestId
      });
    },

    async listUsers(limit, offset) {
      return repository.listUsers(limit, offset);
    },

    async createUser(input, actor, request) {
      const fullName = requireString(input.fullName, "Full name", 150);
      const email = requireString(input.email, "Email", 190).toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new AppError(400, "INVALID_EMAIL", "A valid email address is required.");
      }
      validatePassword(input.password);
      if (input.phone !== undefined && (typeof input.phone !== "string" || input.phone.length > 30)) {
        throw new AppError(400, "INVALID_PHONE", "Phone number must be no more than 30 characters.");
      }
      const preferredLanguage = input.preferredLanguage || "en";
      if (!["en", "am"].includes(preferredLanguage)) {
        throw new AppError(400, "INVALID_LANGUAGE", "Preferred language must be 'en' or 'am'.");
      }
      validateIds(input.roleIds, "INVALID_ROLE_IDS", "Role IDs");
      const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
      try {
        return await repository.createUser({
          fullName,
          email,
          phone: input.phone,
          passwordHash,
          preferredLanguage,
          roleIds: input.roleIds,
          actorId: actor.id,
          audit: {
            action: "user.created",
            summary: { roleIds: input.roleIds },
            ipAddress: request.ipAddress,
            requestId: request.requestId
          }
        });
      } catch (error) {
        ensureUniqueError(error, "user");
      }
    },

    async updateUser(userId, input, actor, request) {
      const updates = {};
      if (input.fullName !== undefined) updates.fullName = requireString(input.fullName, "Full name", 150);
      if (input.email !== undefined) {
        const email = requireString(input.email, "Email", 190).toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          throw new AppError(400, "INVALID_EMAIL", "A valid email address is required.");
        }
        updates.email = email;
      }
      if (input.phone !== undefined) {
        if (input.phone !== null && (typeof input.phone !== "string" || input.phone.length > 30)) {
          throw new AppError(400, "INVALID_PHONE", "Phone number must be no more than 30 characters.");
        }
        updates.phone = input.phone;
      }
      if (input.preferredLanguage !== undefined) {
        if (!["en", "am"].includes(input.preferredLanguage)) {
          throw new AppError(400, "INVALID_LANGUAGE", "Preferred language must be 'en' or 'am'.");
        }
        updates.preferredLanguage = input.preferredLanguage;
      }
      if (input.isActive !== undefined) {
        if (typeof input.isActive !== "boolean") {
          throw new AppError(400, "INVALID_ACCOUNT_STATUS", "isActive must be a boolean.");
        }
        updates.isActive = input.isActive;
      }
      if (input.roleIds !== undefined) {
        validateIds(input.roleIds, "INVALID_ROLE_IDS", "Role IDs");
        updates.roleIds = input.roleIds;
      }
      if (!Object.keys(updates).length) {
        throw new AppError(400, "EMPTY_UPDATE", "At least one supported user field must be provided.");
      }
      try {
        return await repository.updateUser(userId, updates, actor.id, {
          action: "user.updated",
          summary: {
            fields: Object.keys(updates),
            roleIds: updates.roleIds,
            isActive: updates.isActive
          },
          ipAddress: request.ipAddress,
          requestId: request.requestId
        });
      } catch (error) {
        ensureUniqueError(error, "user");
      }
    },

    async setUserPassword(userId, password, actor, request) {
      validatePassword(password);
      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      await repository.updateUser(userId, { passwordHash }, actor.id, {
        action: "user.password.reset",
        summary: {},
        ipAddress: request.ipAddress,
        requestId: request.requestId
      });
    },

    async listRoles() {
      return repository.listRoles();
    },

    async createRole(input, actor, request) {
      const name = requireString(input.name, "Role name", 80);
      if (input.description !== undefined && input.description !== null && typeof input.description !== "string") {
        throw new AppError(400, "INVALID_DESCRIPTION", "Role description must be a string.");
      }
      try {
        return await repository.createRole({
          name,
          description: input.description,
          actorId: actor.id,
          audit: { action: "role.created", summary: {}, ipAddress: request.ipAddress, requestId: request.requestId }
        });
      } catch (error) {
        ensureUniqueError(error, "role");
      }
    },

    async updateRole(roleId, input, actor, request) {
      const updates = {};
      if (input.name !== undefined) updates.name = requireString(input.name, "Role name", 80);
      if (input.description !== undefined) {
        if (typeof input.description !== "string" && input.description !== null) {
          throw new AppError(400, "INVALID_DESCRIPTION", "Role description must be a string or null.");
        }
        updates.description = input.description;
      }
      if (!Object.keys(updates).length) {
        throw new AppError(400, "EMPTY_UPDATE", "A role name or description must be provided.");
      }
      try {
        return await repository.updateRole(roleId, updates, actor.id, {
          action: "role.updated",
          summary: { fields: Object.keys(updates) },
          ipAddress: request.ipAddress,
          requestId: request.requestId
        });
      } catch (error) {
        ensureUniqueError(error, "role");
      }
    },

    async listPermissions() {
      return repository.listPermissions();
    },

    async createPermission(input, actor, request) {
      const name = requireString(input.name, "Permission name", 120);
      const module = requireString(input.module, "Module", 80);
      if (!/^[a-z][a-z0-9]*(?:[._:-][a-z0-9]+)*$/.test(name)) {
        throw new AppError(400, "INVALID_PERMISSION_NAME", "Permission names must use lowercase dotted or colon-separated identifiers.");
      }
      if (input.description !== undefined && input.description !== null && typeof input.description !== "string") {
        throw new AppError(400, "INVALID_DESCRIPTION", "Permission description must be a string.");
      }
      try {
        return await repository.createPermission({
          name,
          module,
          description: input.description,
          actorId: actor.id,
          audit: { action: "permission.created", summary: {}, ipAddress: request.ipAddress, requestId: request.requestId }
        });
      } catch (error) {
        ensureUniqueError(error, "permission");
      }
    },

    async setRolePermissions(roleId, permissionIds, actor, request) {
      if (!Array.isArray(permissionIds)) {
        throw new AppError(400, "INVALID_PERMISSION_IDS", "Permission IDs must be an array.");
      }
      validateIds(permissionIds, "INVALID_PERMISSION_IDS", "Permission IDs");
      return repository.setRolePermissions(roleId, permissionIds, actor.id, {
        action: "role.permissions.updated",
        summary: { permissionIds },
        ipAddress: request.ipAddress,
        requestId: request.requestId
      });
    },

    async listAuditLogs(limit, offset) {
      return repository.listAuditLogs(limit, offset);
    }
  };
}

module.exports = createAuthService;
