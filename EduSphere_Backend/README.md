# EduSphere backend

See the repository [README](../README.md) for complete setup, migration, test,
and production build instructions.

## API

- `GET /api/v1/health` checks the API and MySQL connection.
- `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`,
  and `POST /api/v1/auth/change-password` implement cookie-based sessions.
- `/api/v1/users`, `/api/v1/roles`, `/api/v1/permissions`, and
  `/api/v1/audit-logs` enforce backend permissions.
- Responses use the SDD error envelope: `{ "error": { "code", "message" } }`.
- `GET /api/health` remains as a compatibility alias; new API routes belong
  under `/api/v1`.

## Layers

- `src/routes/` — versioned HTTP route definitions.
- `src/controllers/` — HTTP request/response handling.
- `src/services/` — application/domain operations.
- `src/repositories/` — database access.
- `src/config/` — environment and MySQL pool configuration.
- `src/middleware/` — not-found and centralized error handling.
- `database/migrations/` — MySQL schema migrations.

Apply migrations 001 and 002 in order. Bootstrap the first administrator in an
interactive terminal with `npm run bootstrap:super-admin`; the command refuses
to run after an active Super Admin has been created. Import
`postman/phase2_auth_rbac.postman_collection.json` to exercise the API.
