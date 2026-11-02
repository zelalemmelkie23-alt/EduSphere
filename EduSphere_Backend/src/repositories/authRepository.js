const AppError = require("../errors/AppError");

function mapIdentity(user, roles, permissions) {
  return {
    id: Number(user.id),
    fullName: user.full_name,
    email: user.email,
    phone: user.phone,
    preferredLanguage: user.preferred_language,
    isActive: Boolean(user.is_active),
    lastLoginAt: user.last_login_at,
    roles: [...new Set(roles)],
    permissions: [...new Set(permissions)]
  };
}

function createAuthRepository(database) {
  async function getRoles(userId, executor = database) {
    const [rows] = await executor.query(
      `SELECT r.name
       FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = ?
       ORDER BY r.name`,
      [userId]
    );
    return rows.map((row) => row.name);
  }

  async function getPermissions(userId, executor = database) {
    const [rows] = await executor.query(
      `SELECT DISTINCT p.name
       FROM user_roles ur
       JOIN role_permissions rp ON rp.role_id = ur.role_id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE ur.user_id = ?
       ORDER BY p.name`,
      [userId]
    );
    return rows.map((row) => row.name);
  }

  async function getIdentity(user, executor = database) {
    const [roles, permissions] = await Promise.all([
      getRoles(user.id, executor),
      getPermissions(user.id, executor)
    ]);
    return mapIdentity(user, roles, permissions);
  }

  async function insertAudit({
    actorUserId = null,
    action,
    entityType,
    entityId = null,
    requestId = null,
    summary = null,
    ipAddress = null
  }, executor = database) {
    await executor.query(
      `INSERT INTO audit_logs
       (actor_user_id, action, entity_type, entity_id, request_id, summary, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [actorUserId, action, entityType, entityId, requestId, summary ? JSON.stringify(summary) : null, ipAddress]
    );
  }

  async function withTransaction(work) {
    const connection = await database.getConnection();
    try {
      await connection.beginTransaction();
      const result = await work(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async function lockSuperAdminRole(connection) {
    const [rows] = await connection.query(
      "SELECT id FROM roles WHERE name = 'Super Admin' FOR UPDATE"
    );
    if (!rows[0]) {
      throw new AppError(500, "AUTH_ROLES_NOT_CONFIGURED", "The system roles have not been initialized.");
    }
    return rows[0].id;
  }

  async function getActiveSuperAdmins(connection, roleId) {
    const [rows] = await connection.query(
      `SELECT u.id
       FROM users u
       JOIN user_roles ur ON ur.user_id = u.id
       WHERE ur.role_id = ? AND u.is_active = TRUE
       FOR UPDATE`,
      [roleId]
    );
    return rows.map((row) => Number(row.id));
  }

  async function applyRoleIds(connection, userId, roleIds, actorId) {
    if (roleIds === undefined) return;
    const normalized = [...new Set(roleIds.map(Number))];
    if (normalized.length !== roleIds.length || normalized.some((id) => !Number.isSafeInteger(id) || id <= 0)) {
      throw new AppError(400, "INVALID_ROLE_IDS", "Role IDs must be unique positive integers.");
    }
    if (normalized.length) {
      const placeholders = normalized.map(() => "?").join(", ");
      const [rows] = await connection.query(
        `SELECT id FROM roles WHERE id IN (${placeholders})`,
        normalized
      );
      if (rows.length !== normalized.length) {
        throw new AppError(400, "INVALID_ROLE_IDS", "One or more role IDs do not exist.");
      }
    }
    await connection.query("DELETE FROM user_roles WHERE user_id = ?", [userId]);
    for (const roleId of normalized) {
      await connection.query(
        "INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES (?, ?, ?)",
        [userId, roleId, actorId]
      );
    }
  }

  async function getUserById(userId, executor = database) {
    const [rows] = await executor.query(
      `SELECT id, full_name, email, phone, password_hash, preferred_language,
              is_active, last_login_at, created_at, updated_at
       FROM users WHERE id = ?`,
      [userId]
    );
    return rows[0] || null;
  }

  return {
    async findUserByEmail(email) {
      const [rows] = await database.query(
        `SELECT id, full_name, email, phone, password_hash, preferred_language,
                is_active, last_login_at
         FROM users WHERE email = ?`,
        [email]
      );
      return rows[0] || null;
    },

    async getIdentityById(userId) {
      const user = await getUserById(userId);
      if (!user || !user.is_active) return null;
      return getIdentity(user);
    },

    async findSession(tokenHash) {
      const [rows] = await database.query(
        `SELECT u.id, u.full_name, u.email, u.phone, u.preferred_language,
                u.is_active, u.last_login_at
         FROM auth_sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = ? AND s.expires_at > CURRENT_TIMESTAMP
           AND u.is_active = TRUE`,
        [tokenHash]
      );
      if (!rows[0]) return null;
      await database.query(
        "UPDATE auth_sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE token_hash = ?",
        [tokenHash]
      );
      return getIdentity(rows[0]);
    },

    async deleteSession(tokenHash) {
      await database.query("DELETE FROM auth_sessions WHERE token_hash = ?", [tokenHash]);
    },

    async deleteUserSessions(userId) {
      await database.query("DELETE FROM auth_sessions WHERE user_id = ?", [userId]);
    },

    async writeAudit(event) {
      await insertAudit(event);
    },

    async createAuthenticatedSession({ userId, tokenHash, expiresAt, ipAddress, userAgent, audit }) {
      await withTransaction(async (connection) => {
        await connection.query("DELETE FROM auth_sessions WHERE expires_at <= CURRENT_TIMESTAMP");
        await connection.query(
          `INSERT INTO auth_sessions (user_id, token_hash, expires_at, ip_address, user_agent)
           VALUES (?, ?, ?, ?, ?)`,
          [userId, tokenHash, expiresAt, ipAddress, userAgent]
        );
        await connection.query(
          "UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?",
          [userId]
        );
        await insertAudit(audit, connection);
      });
    },

    async listUsers(limit, offset) {
      const [rows] = await database.query(
        `SELECT id, full_name, email, phone, preferred_language,
                is_active, last_login_at, created_at, updated_at
         FROM users ORDER BY id LIMIT ? OFFSET ?`,
        [limit, offset]
      );
      return Promise.all(rows.map(async (user) => {
        const identity = await getIdentity(user);
        return { ...identity, createdAt: user.created_at, updatedAt: user.updated_at };
      }));
    },

    async createUser({ fullName, email, phone, passwordHash, preferredLanguage, roleIds, actorId, audit }) {
      return withTransaction(async (connection) => {
        const roleId = await lockSuperAdminRole(connection);
        const [result] = await connection.query(
          `INSERT INTO users
           (full_name, email, phone, password_hash, preferred_language, is_active)
           VALUES (?, ?, ?, ?, ?, TRUE)`,
          [fullName, email, phone || null, passwordHash, preferredLanguage || "en"]
        );
        const userId = Number(result.insertId);
        if (!userId) throw new AppError(500, "USER_CREATE_FAILED", "The user account could not be created.");
        await applyRoleIds(connection, userId, roleIds, actorId);
        const admins = await getActiveSuperAdmins(connection, roleId);
        if (roleIds && roleIds.includes(Number(roleId)) && !admins.includes(userId)) {
          admins.push(userId);
        }
        await insertAudit({ ...audit, actorUserId: actorId, entityType: "user", entityId: userId }, connection);
        const user = await getUserById(userId, connection);
        return getIdentity(user, connection);
      });
    },

    async updateUser(userId, updates, actorId, audit) {
      return withTransaction(async (connection) => {
        const superAdminRoleId = await lockSuperAdminRole(connection);
        const user = await getUserById(userId, connection);
        if (!user) throw new AppError(404, "USER_NOT_FOUND", "The requested user was not found.");

        const activeAdmins = await getActiveSuperAdmins(connection, superAdminRoleId);
        const currentIsAdmin = activeAdmins.includes(Number(userId));
        const willBeActive = updates.isActive ?? Boolean(user.is_active);
        let willHaveSuperAdmin = currentIsAdmin;
        if (updates.roleIds !== undefined) {
          const [rows] = updates.roleIds.length
            ? await connection.query(
              `SELECT id FROM roles WHERE id IN (${updates.roleIds.map(() => "?").join(", ")})`,
              updates.roleIds
            )
            : [[]];
          willHaveSuperAdmin = rows.some((row) => Number(row.id) === Number(superAdminRoleId));
        }
        if (currentIsAdmin && (!willBeActive || !willHaveSuperAdmin) && activeAdmins.length <= 1) {
          throw new AppError(409, "LAST_ACTIVE_SUPER_ADMIN", "The last active Super Admin cannot be deactivated or removed.");
        }

        const fields = [];
        const values = [];
        for (const [key, column] of [
          ["fullName", "full_name"],
          ["email", "email"],
          ["phone", "phone"],
          ["preferredLanguage", "preferred_language"],
          ["isActive", "is_active"]
        ]) {
          if (updates[key] !== undefined) {
            fields.push(`${column} = ?`);
            values.push(key === "isActive" ? updates[key] : updates[key] || null);
          }
        }
        if (updates.passwordHash) {
          fields.push("password_hash = ?");
          values.push(updates.passwordHash);
        }
        if (fields.length) {
          await connection.query(
            `UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
            [...values, userId]
          );
        }
        await applyRoleIds(connection, userId, updates.roleIds, actorId);
        if (updates.isActive === false || updates.passwordHash) {
          await connection.query("DELETE FROM auth_sessions WHERE user_id = ?", [userId]);
        }
        await insertAudit({ ...audit, actorUserId: actorId, entityType: "user", entityId: userId }, connection);
        const updated = await getUserById(userId, connection);
        return getIdentity(updated, connection);
      });
    },

    async listRoles() {
      const [rows] = await database.query(
        "SELECT id, name, description, is_system_role, created_at FROM roles ORDER BY name"
      );
      return rows.map((role) => ({
        id: Number(role.id),
        name: role.name,
        description: role.description,
        isSystemRole: Boolean(role.is_system_role),
        createdAt: role.created_at
      }));
    },

    async createRole({ name, description, actorId, audit }) {
      return withTransaction(async (connection) => {
        const [result] = await connection.query(
          "INSERT INTO roles (name, description, is_system_role) VALUES (?, ?, FALSE)",
          [name, description || null]
        );
        const id = Number(result.insertId);
        await insertAudit({ ...audit, actorUserId: actorId, entityType: "role", entityId: id }, connection);
        return { id, name, description: description || null, isSystemRole: false };
      });
    },

    async updateRole(roleId, updates, actorId, audit) {
      return withTransaction(async (connection) => {
        const [rows] = await connection.query("SELECT id, name, is_system_role FROM roles WHERE id = ? FOR UPDATE", [roleId]);
        if (!rows[0]) throw new AppError(404, "ROLE_NOT_FOUND", "The requested role was not found.");
        if (updates.name !== undefined && rows[0].is_system_role) {
          throw new AppError(409, "SYSTEM_ROLE_PROTECTED", "Built-in system role names cannot be changed.");
        }
        const fields = [];
        const values = [];
        if (updates.name !== undefined) {
          fields.push("name = ?");
          values.push(updates.name);
        }
        if (updates.description !== undefined) {
          fields.push("description = ?");
          values.push(updates.description || null);
        }
        if (fields.length) {
          await connection.query(`UPDATE roles SET ${fields.join(", ")} WHERE id = ?`, [...values, roleId]);
        }
        await insertAudit({ ...audit, actorUserId: actorId, entityType: "role", entityId: roleId }, connection);
        return {
          id: Number(roleId),
          name: updates.name === undefined ? rows[0].name : updates.name,
          description: updates.description === undefined ? undefined : updates.description || null,
          isSystemRole: Boolean(rows[0].is_system_role)
        };
      });
    },

    async listPermissions() {
      const [rows] = await database.query(
        "SELECT id, name, module, description FROM permissions ORDER BY module, name"
      );
      return rows.map((permission) => ({
        id: Number(permission.id),
        name: permission.name,
        module: permission.module,
        description: permission.description
      }));
    },

    async createPermission({ name, module, description, actorId, audit }) {
      return withTransaction(async (connection) => {
        const [result] = await connection.query(
          "INSERT INTO permissions (name, module, description) VALUES (?, ?, ?)",
          [name, module, description || null]
        );
        const id = Number(result.insertId);
        await insertAudit({ ...audit, actorUserId: actorId, entityType: "permission", entityId: id }, connection);
        return { id, name, module, description: description || null };
      });
    },

    async setRolePermissions(roleId, permissionIds, actorId, audit) {
      return withTransaction(async (connection) => {
        const [roles] = await connection.query("SELECT id FROM roles WHERE id = ? FOR UPDATE", [roleId]);
        if (!roles[0]) throw new AppError(404, "ROLE_NOT_FOUND", "The requested role was not found.");
        const normalized = [...new Set(permissionIds.map(Number))];
        if (normalized.length !== permissionIds.length || normalized.some((id) => !Number.isSafeInteger(id) || id <= 0)) {
          throw new AppError(400, "INVALID_PERMISSION_IDS", "Permission IDs must be unique positive integers.");
        }
        if (normalized.length) {
          const [permissions] = await connection.query(
            `SELECT id FROM permissions WHERE id IN (${normalized.map(() => "?").join(", ")})`,
            normalized
          );
          if (permissions.length !== normalized.length) {
            throw new AppError(400, "INVALID_PERMISSION_IDS", "One or more permission IDs do not exist.");
          }
        }
        await connection.query("DELETE FROM role_permissions WHERE role_id = ?", [roleId]);
        for (const permissionId of normalized) {
          await connection.query("INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)", [roleId, permissionId]);
        }
        await insertAudit({ ...audit, actorUserId: actorId, entityType: "role", entityId: roleId }, connection);
        return normalized;
      });
    },

    async listAuditLogs(limit, offset) {
      const [rows] = await database.query(
        `SELECT id, actor_user_id, action, entity_type, entity_id, request_id,
                summary, ip_address, created_at
         FROM audit_logs ORDER BY id DESC LIMIT ? OFFSET ?`,
        [limit, offset]
      );
      return rows.map((row) => ({
        id: Number(row.id),
        actorUserId: row.actor_user_id === null ? null : Number(row.actor_user_id),
        action: row.action,
        entityType: row.entity_type,
        entityId: row.entity_id === null ? null : Number(row.entity_id),
        requestId: row.request_id,
        summary: typeof row.summary === "string" ? JSON.parse(row.summary) : row.summary,
        ipAddress: row.ip_address,
        createdAt: row.created_at
      }));
    }
  };
}

module.exports = createAuthRepository;
