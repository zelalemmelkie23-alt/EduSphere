const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const createApp = require("../src/app");
const AppError = require("../src/errors/AppError");

const appConfig = {
  frontendOrigin: "http://localhost:5173",
  sessionCookieName: "edusphere_session",
  secureSessionCookie: false
};

function createMemoryRepository(users) {
  let nextUserId = Math.max(...users.map((user) => user.id)) + 1;
  let nextRoleId = 4;
  let nextPermissionId = 4;
  const sessions = new Map();
  const auditLogs = [];
  const roles = [
    { id: 1, name: "Super Admin", description: "All access", isSystemRole: true },
    { id: 2, name: "Teacher", description: "Teaching", isSystemRole: true },
    { id: 3, name: "Attendance Controller", description: "Assigned attendance access", isSystemRole: true }
  ];
  const permissions = [
    { id: 1, name: "users.manage", module: "users" },
    { id: 2, name: "roles.manage", module: "roles" },
    { id: 3, name: "attendance.read", module: "attendance" }
  ];
  const rolePermissions = new Map([[1, new Set([1, 2, 3])], [2, new Set()], [3, new Set([3])]]);

  function identity(user) {
    if (!user || !user.is_active) return null;
    const userRoles = roles.filter((role) => user.roleIds.includes(role.id)).map((role) => role.name).sort();
    const userPermissions = [...new Set(user.roleIds.flatMap((id) =>
      [...(rolePermissions.get(id) || [])].map((permissionId) =>
        permissions.find((permission) => permission.id === permissionId)?.name
      )
    ).filter(Boolean))].sort();
    return {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      phone: user.phone,
      preferredLanguage: user.preferred_language,
      isActive: user.is_active,
      roles: userRoles,
      permissions: userPermissions
    };
  }

  function audit(event) {
    auditLogs.push({ id: auditLogs.length + 1, ...event, createdAt: new Date().toISOString() });
  }

  function deleteSessionsForUser(userId) {
    for (const [hash, session] of sessions) if (session.userId === userId) sessions.delete(hash);
  }

  return {
    sessions,
    auditLogs,
    users,
    findUserByEmail: async (email) => users.find((user) => user.email === email) || null,
    getIdentityById: async (id) => identity(users.find((user) => user.id === id)),
    findSession: async (tokenHash) => {
      const session = sessions.get(tokenHash);
      if (!session || session.expiresAt <= new Date()) return null;
      return identity(users.find((user) => user.id === session.userId));
    },
    deleteSession: async (tokenHash) => sessions.delete(tokenHash),
    deleteUserSessions: async (userId) => deleteSessionsForUser(userId),
    createAuthenticatedSession: async ({ userId, tokenHash, expiresAt, audit: event }) => {
      sessions.set(tokenHash, { userId, expiresAt });
      audit(event);
    },
    updateLastLogin: async (id) => {
      const user = users.find((candidate) => candidate.id === id);
      user.last_login_at = new Date();
    },
    writeAudit: async (event) => audit(event),
    listUsers: async (limit, offset) => users.slice(offset, offset + limit).map((user) => identity(user)),
    createUser: async (input) => {
      const user = {
        id: nextUserId++,
        full_name: input.fullName,
        email: input.email,
        phone: input.phone,
        password_hash: input.passwordHash,
        preferred_language: input.preferredLanguage,
        is_active: true,
        roleIds: input.roleIds
      };
      users.push(user);
      audit({ ...input.audit, actorUserId: input.actorId, entityType: "user", entityId: user.id });
      return identity(user);
    },
    updateUser: async (id, updates, actorId, event) => {
      const user = users.find((candidate) => candidate.id === id);
      if (!user) {
        throw new AppError(404, "USER_NOT_FOUND", "The requested user was not found.");
      }
      const hasSuperAdmin = (updates.roleIds || user.roleIds).includes(1);
      const remainsActive = updates.isActive ?? user.is_active;
      const admins = users.filter((candidate) => candidate.is_active && candidate.roleIds.includes(1));
      if (user.is_active && user.roleIds.includes(1) && (!remainsActive || !hasSuperAdmin) && admins.length <= 1) {
        throw new AppError(409, "LAST_ACTIVE_SUPER_ADMIN", "The last active Super Admin cannot be deactivated or removed.");
      }
      Object.assign(user, updates);
      if (updates.roleIds) user.roleIds = updates.roleIds;
      if (updates.fullName !== undefined) user.full_name = updates.fullName;
      if (updates.email !== undefined) user.email = updates.email;
      if (updates.phone !== undefined) user.phone = updates.phone;
      if (updates.preferredLanguage !== undefined) user.preferred_language = updates.preferredLanguage;
      if (updates.isActive !== undefined) user.is_active = updates.isActive;
      if (updates.passwordHash) user.password_hash = updates.passwordHash;
      if (updates.isActive === false || updates.passwordHash) {
        deleteSessionsForUser(id);
      }
      audit({ ...event, actorUserId: actorId, entityType: "user", entityId: id });
      return identity(user) || { id, isActive: false, roles: [], permissions: [] };
    },
    listRoles: async () => roles,
    createRole: async ({ name, description, actorId, audit: event }) => {
      const role = { id: nextRoleId++, name, description, isSystemRole: false };
      roles.push(role);
      rolePermissions.set(role.id, new Set());
      audit({ ...event, actorUserId: actorId, entityType: "role", entityId: role.id });
      return role;
    },
    updateRole: async (id, updates) => {
      const role = roles.find((candidate) => candidate.id === id);
      if (!role) {
        throw new AppError(404, "ROLE_NOT_FOUND", "The requested role was not found.");
      }
      if (updates.name !== undefined && role.isSystemRole) {
        throw new AppError(409, "SYSTEM_ROLE_PROTECTED", "Built-in system role names cannot be changed.");
      }
      if (updates.name !== undefined) role.name = updates.name;
      if (updates.description !== undefined) role.description = updates.description;
      return role;
    },
    listPermissions: async () => permissions,
    createPermission: async (input) => {
      const permission = { id: nextPermissionId++, name: input.name, module: input.module, description: input.description };
      permissions.push(permission);
      audit({ ...input.audit, actorUserId: input.actorId, entityType: "permission", entityId: permission.id });
      return permission;
    },
    setRolePermissions: async (roleId, permissionIds, actorId, event) => {
      rolePermissions.set(roleId, new Set(permissionIds));
      audit({ ...event, actorUserId: actorId, entityType: "role", entityId: roleId });
      return permissionIds;
    },
    listAuditLogs: async (limit, offset) => auditLogs.slice(offset, offset + limit)
  };
}

async function setup(t, { appConfig: config = appConfig } = {}) {
  const passwordHash = await bcrypt.hash("correct horse battery", 4);
  const users = [
    {
      id: 1,
      full_name: "Primary Admin",
      email: "admin@example.test",
      phone: null,
      password_hash: passwordHash,
      preferred_language: "en",
      is_active: true,
      roleIds: [1]
    },
    {
      id: 2,
      full_name: "Teacher Account",
      email: "teacher@example.test",
      phone: null,
      password_hash: passwordHash,
      preferred_language: "en",
      is_active: true,
      roleIds: [2]
    },
    {
      id: 3,
      full_name: "Inactive Account",
      email: "inactive@example.test",
      phone: null,
      password_hash: passwordHash,
      preferred_language: "en",
      is_active: false,
      roleIds: [2]
    }
  ];
  const authRepository = createMemoryRepository(users);
  const app = createApp({
    database: { query: async () => [[{ ready: 1 }], []] },
    authRepository,
    appConfig: config,
    logger: { error() {} }
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    authRepository
  };
}

async function login(url, email = "admin@example.test", password = "correct horse battery") {
  const response = await fetch(`${url}/api/v1/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  return { response, payload: await response.json() };
}

test("login creates a secure HttpOnly session cookie and exposes no secret fields", async (t) => {
  const { url } = await setup(t);
  const { response, payload } = await login(url);

  assert.equal(response.status, 200);
  assert.equal(payload.data.user.email, "admin@example.test");
  assert.equal("password_hash" in payload.data.user, false);
  assert.equal("token" in payload.data, false);
  assert.match(response.headers.get("set-cookie"), /HttpOnly/);
  assert.match(response.headers.get("set-cookie"), /SameSite=Strict/);
  assert.match(response.headers.get("set-cookie"), /Path=\/api\/v1/);
});

test("inactive accounts and invalid credentials cannot obtain sessions", async (t) => {
  const { url, authRepository } = await setup(t);
  const inactive = await login(url, "inactive@example.test");
  const invalid = await login(url, "admin@example.test", "wrong password value");

  assert.equal(inactive.response.status, 401);
  assert.deepEqual(inactive.payload.error, {
    code: "INVALID_CREDENTIALS",
    message: "Email or password is incorrect."
  });
  assert.equal(inactive.response.headers.get("set-cookie"), null);
  assert.equal(invalid.response.status, 401);
  assert.equal(authRepository.sessions.size, 0);
  assert.equal(authRepository.auditLogs.filter((log) => log.action === "auth.login.failed").length, 2);
});

test("successful login resets failed-attempt rate limiting", async (t) => {
  const { url } = await setup(t);
  for (let attempt = 0; attempt < 9; attempt += 1) {
    const failed = await login(url, "admin@example.test", "wrong password value");
    assert.equal(failed.response.status, 401);
  }
  const accepted = await login(url);
  assert.equal(accepted.response.status, 200);
  const afterSuccess = await login(url, "admin@example.test", "wrong password value");
  assert.equal(afterSuccess.response.status, 401);
});

test("protected endpoints reject anonymous and unauthorized requests", async (t) => {
  const { url } = await setup(t);
  const anonymous = await fetch(`${url}/api/v1/auth/me`);
  assert.equal(anonymous.status, 401);
  assert.equal((await anonymous.json()).error.code, "UNAUTHENTICATED");

  const { payload } = await login(url, "teacher@example.test");
  const cookie = (await login(url, "teacher@example.test")).response.headers.get("set-cookie").split(";")[0];
  assert.equal(payload.data.user.roles.includes("Teacher"), true);
  const forbidden = await fetch(`${url}/api/v1/users`, { headers: { cookie } });
  assert.equal(forbidden.status, 403);
  assert.equal((await forbidden.json()).error.code, "FORBIDDEN");
});

test("authenticated admin can manage users, roles, permissions, and audit records", async (t) => {
  const { url } = await setup(t);
  const { response: loginResponse } = await login(url);
  const cookie = loginResponse.headers.get("set-cookie").split(";")[0];

  const usersResponse = await fetch(`${url}/api/v1/users`, { headers: { cookie } });
  assert.equal(usersResponse.status, 200);
  const usersPayload = await usersResponse.json();
  assert.equal(usersPayload.data.users.length, 3);
  assert.equal("password_hash" in usersPayload.data.users[0], false);

  const createUserResponse = await fetch(`${url}/api/v1/users`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json", origin: appConfig.frontendOrigin },
    body: JSON.stringify({
      fullName: "New Teacher",
      email: "new@example.test",
      password: "a secure password phrase",
      roleIds: [2]
    })
  });
  assert.equal(createUserResponse.status, 201);

  const createRoleResponse = await fetch(`${url}/api/v1/roles`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json", origin: appConfig.frontendOrigin },
    body: JSON.stringify({ name: "Attendance Assistant", description: "Additional assignment" })
  });
  assert.equal(createRoleResponse.status, 201);
  const roleId = (await createRoleResponse.json()).data.role.id;
  const renameRoleResponse = await fetch(`${url}/api/v1/roles/${roleId}`, {
    method: "PATCH",
    headers: { cookie, "content-type": "application/json", origin: appConfig.frontendOrigin },
    body: JSON.stringify({ name: "Attendance Assistant Updated" })
  });
  assert.equal(renameRoleResponse.status, 200);
  assert.equal((await renameRoleResponse.json()).data.role.name, "Attendance Assistant Updated");

  const renameSystemRoleResponse = await fetch(`${url}/api/v1/roles/1`, {
    method: "PATCH",
    headers: { cookie, "content-type": "application/json", origin: appConfig.frontendOrigin },
    body: JSON.stringify({ name: "Renamed Super Admin" })
  });
  assert.equal(renameSystemRoleResponse.status, 409);
  assert.equal((await renameSystemRoleResponse.json()).error.code, "SYSTEM_ROLE_PROTECTED");

  const permissionsResponse = await fetch(`${url}/api/v1/permissions`, { headers: { cookie } });
  const permissions = (await permissionsResponse.json()).data.permissions;
  const permissionId = permissions.find((permission) => permission.name === "users.manage").id;
  const assignmentResponse = await fetch(`${url}/api/v1/roles/${roleId}/permissions`, {
    method: "PUT",
    headers: { cookie, "content-type": "application/json", origin: appConfig.frontendOrigin },
    body: JSON.stringify({ permissionIds: [permissionId] })
  });
  assert.equal(assignmentResponse.status, 200);

  const auditResponse = await fetch(`${url}/api/v1/audit-logs`, { headers: { cookie } });
  assert.equal(auditResponse.status, 200);
  const logs = (await auditResponse.json()).data.logs;
  assert.ok(logs.some((log) => log.action === "user.created"));
  assert.ok(logs.some((log) => log.action === "role.created"));
});

test("attendance permission is separate from the teacher role and multiple roles are returned", async (t) => {
  const { url } = await setup(t);
  const { response: loginResponse } = await login(url);
  const cookie = loginResponse.headers.get("set-cookie").split(";")[0];

  const createTeacherResponse = await fetch(`${url}/api/v1/users`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json", origin: appConfig.frontendOrigin },
    body: JSON.stringify({
      fullName: "Teacher Attendance Controller",
      email: "attendance-teacher@example.test",
      password: "a secure password phrase",
      roleIds: [2, 3]
    })
  });
  assert.equal(createTeacherResponse.status, 201);
  const user = (await createTeacherResponse.json()).data.user;
  assert.deepEqual(user.roles, ["Attendance Controller", "Teacher"]);
  assert.deepEqual(user.permissions, ["attendance.read"]);
});

test("password changes require the current password and revoke existing sessions", async (t) => {
  const { url } = await setup(t);
  const { response: loginResponse } = await login(url, "teacher@example.test");
  const cookie = loginResponse.headers.get("set-cookie").split(";")[0];

  const response = await fetch(`${url}/api/v1/auth/change-password`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json", origin: appConfig.frontendOrigin },
    body: JSON.stringify({
      currentPassword: "correct horse battery",
      newPassword: "a brand new password phrase"
    })
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("set-cookie"), /Max-Age=0/);
  assert.equal((await fetch(`${url}/api/v1/auth/me`, { headers: { cookie } })).status, 401);
  assert.equal((await login(url, "teacher@example.test", "a brand new password phrase")).response.status, 200);
  assert.equal((await login(url, "teacher@example.test", "correct horse battery")).response.status, 401);
});

test("administrative password reset clears the actor cookie when resetting themself", async (t) => {
  const { url } = await setup(t);
  const { response: loginResponse } = await login(url);
  const cookie = loginResponse.headers.get("set-cookie").split(";")[0];
  const response = await fetch(`${url}/api/v1/users/1/password`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json", origin: appConfig.frontendOrigin },
    body: JSON.stringify({ password: "a reset password phrase" })
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("set-cookie"), /Max-Age=0/);
  assert.equal((await fetch(`${url}/api/v1/auth/me`, { headers: { cookie } })).status, 401);
});

test("production sessions set the Secure cookie attribute", async (t) => {
  const { url } = await setup(t, {
    appConfig: { ...appConfig, secureSessionCookie: true }
  });
  const { response } = await login(url);
  assert.match(response.headers.get("set-cookie"), /Secure/);
});

test("last active Super Admin cannot be deactivated or lose the role", async (t) => {
  const { url } = await setup(t);
  const { response: loginResponse } = await login(url);
  const cookie = loginResponse.headers.get("set-cookie").split(";")[0];

  for (const body of [{ isActive: false }, { roleIds: [2] }]) {
    const response = await fetch(`${url}/api/v1/users/1`, {
      method: "PATCH",
      headers: { cookie, "content-type": "application/json", origin: appConfig.frontendOrigin },
      body: JSON.stringify(body)
    });
    assert.equal(response.status, 409);
    assert.equal((await response.json()).error.code, "LAST_ACTIVE_SUPER_ADMIN");
  }
});

test("multiple active Super Admins are supported and one can be deactivated safely", async (t) => {
  const { url } = await setup(t);
  const { response: loginResponse } = await login(url);
  const cookie = loginResponse.headers.get("set-cookie").split(";")[0];
  const createAdminResponse = await fetch(`${url}/api/v1/users`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json", origin: appConfig.frontendOrigin },
    body: JSON.stringify({
      fullName: "Second Admin",
      email: "second-admin@example.test",
      password: "another secure password",
      roleIds: [1]
    })
  });
  assert.equal(createAdminResponse.status, 201);
  const secondId = (await createAdminResponse.json()).data.user.id;

  const deactivateResponse = await fetch(`${url}/api/v1/users/1`, {
    method: "PATCH",
    headers: { cookie, "content-type": "application/json", origin: appConfig.frontendOrigin },
    body: JSON.stringify({ isActive: false })
  });
  assert.equal(deactivateResponse.status, 200);
  assert.equal((await deactivateResponse.json()).data.user.isActive, false);

  const secondAdmin = await fetch(`${url}/api/v1/users`, {
    headers: { cookie: (await login(url, "second-admin@example.test", "another secure password")).response.headers.get("set-cookie").split(";")[0] }
  });
  assert.equal(secondAdmin.status, 200);
  assert.ok(secondId > 0);
});

test("deactivation revokes an account's existing sessions", async (t) => {
  const { url } = await setup(t);
  const { response: loginResponse } = await login(url, "teacher@example.test");
  const cookie = loginResponse.headers.get("set-cookie").split(";")[0];
  const adminCookie = (await login(url)).response.headers.get("set-cookie").split(";")[0];

  const response = await fetch(`${url}/api/v1/users/2`, {
    method: "PATCH",
    headers: { cookie: adminCookie, "content-type": "application/json", origin: appConfig.frontendOrigin },
    body: JSON.stringify({ isActive: false })
  });
  assert.equal(response.status, 200);

  const meResponse = await fetch(`${url}/api/v1/auth/me`, { headers: { cookie } });
  assert.equal(meResponse.status, 401);
});

test("login attempts are rate-limited and blocked attempts are audited", async (t) => {
  const { url, authRepository } = await setup(t);
  let finalResponse;
  for (let attempt = 0; attempt < 11; attempt += 1) {
    finalResponse = await fetch(`${url}/api/v1/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}"
    });
  }
  assert.equal(finalResponse.status, 429);
  assert.equal((await finalResponse.json()).error.code, "LOGIN_RATE_LIMITED");
  assert.ok(authRepository.auditLogs.some((log) => log.action === "auth.login.rate_limited"));
});

test("logout invalidates the server-side session and clears the browser cookie", async (t) => {
  const { url } = await setup(t);
  const { response: loginResponse } = await login(url);
  const cookie = loginResponse.headers.get("set-cookie").split(";")[0];
  const logoutResponse = await fetch(`${url}/api/v1/auth/logout`, {
    method: "POST",
    headers: { cookie, origin: appConfig.frontendOrigin }
  });

  assert.equal(logoutResponse.status, 200);
  assert.match(logoutResponse.headers.get("set-cookie"), /Max-Age=0/);
  const meResponse = await fetch(`${url}/api/v1/auth/me`, { headers: { cookie } });
  assert.equal(meResponse.status, 401);
});

test("state-changing cookie requests reject an unexpected Origin", async (t) => {
  const { url } = await setup(t);
  const response = await fetch(`${url}/api/v1/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://attacker.example" },
    body: JSON.stringify({ email: "admin@example.test", password: "correct horse battery" })
  });
  assert.equal(response.status, 403);
  assert.equal((await response.json()).error.code, "INVALID_ORIGIN");
});
