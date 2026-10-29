# EduSphere backend

See the repository [README](../README.md) for complete setup, migration, test,
and production build instructions.

## API

- `GET /api/v1/health` checks the API and MySQL connection.
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
