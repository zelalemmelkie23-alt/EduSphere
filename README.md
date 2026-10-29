# EduSphere Smart School Management System

EduSphere is the initial project setup for a single high school serving Grades
9–12. The supplied SRS and SDD are in [documentation/](./documentation/).
They define the target business functionality; the current application is an
initial frontend/API/database scaffold, not a complete school management system.

## Project layout

- `EduSphere_frontend/` — Vue 3, Vite, Vue Router and the API connectivity UI.
- `EduSphere_Backend/` — Express API, layered health check and MySQL access.
- `EduSphere_Backend/database/migrations/` — versioned MySQL migration scripts.
- `documentation/` — supplied SRS and SDD.

The backend separates HTTP routes/controllers, services, repositories, and
infrastructure/configuration. Business workflows should be implemented in
services, with database access confined to repositories.

## Requirements

- Node.js 22.18 or newer (the frontend Vite configuration specifies its engine
  requirement).
- MySQL 8 or newer, reachable from the backend machine.
- npm (bundled with Node.js).

## Local setup

### 1. Configure MySQL and environment

Copy the backend environment example:

```powershell
Copy-Item EduSphere_Backend\.env.example EduSphere_Backend\.env
```

Set `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` in
`EduSphere_Backend\.env` for a least-privilege application account. The current
example uses port `3036`; change it if your MySQL server listens elsewhere.
Do not commit `.env` or put real credentials in source control.

Apply
[`001_initial_schema.sql`](./EduSphere_Backend/database/migrations/001_initial_schema.sql)
once to your MySQL server using an administrative account (for example, open and
execute it in MySQL Workbench). It creates `school_db`, the initial related
tables, and the Grades 9–12 and built-in role rows. Then grant the configured
application account only the privileges it needs on that database. The
migration does not create database credentials or a default administrator.

### 2. Install dependencies

In PowerShell, from the repository root:

```powershell
Push-Location EduSphere_Backend
npm ci
Pop-Location

Push-Location EduSphere_frontend
npm ci
Pop-Location
```

### 3. Run development servers

Use two terminals from the repository root.

Backend:

```powershell
Set-Location EduSphere_Backend
npm run dev
```

Frontend:

```powershell
Set-Location EduSphere_frontend
npm run dev
```

Open `http://localhost:5173/` for the dashboard or
`http://localhost:5173/health` for the standalone connectivity page. The
dashboard status indicator and health page call `GET /api/v1/health`. A healthy
response verifies both the API and its MySQL connection.

To change the browser API target, set `VITE_API_URL` in
`EduSphere_frontend\.env` (copy it from `.env.example`). Set `FRONTEND_ORIGIN`
and `PORT` in the backend `.env` when your local frontend origin or API port
differs from the example.

## Tests and production builds

Backend tests (database-independent health route tests):

```powershell
Set-Location EduSphere_Backend
npm test
```

Build and locally preview the frontend production bundle:

```powershell
Set-Location EduSphere_frontend
npm run build
npm run preview
```

For production, run the API with `npm start` in `EduSphere_Backend` and serve
the frontend `dist/` output through the deployment's static server or reverse
proxy. Configure production environment variables and HTTPS at deployment;
Vite's preview server is for local verification, not production hosting.

## Current scope and decisions

The initial migration and health-check API are in place, but authentication,
authorization, admissions, enrollment workflows, school operations, and the
other SRS modules are not implemented yet. Do not expose this scaffold as a
production school system.

Before implementing policy-dependent workflows, confirm the decisions called
out in the SRS/SDD, including authentication/session strategy, admission and
account activation policy, grading and promotion rules, attendance correction
policy, school calendar, and section naming/capacity exceptions. The sample
MySQL port is `3036`; confirm that it matches the intended local server.

The existing migration is a useful initial schema, but should not yet be
treated as a final SRS/SDD reconciliation. For example, the SRS lists enrollment
type and allocation timestamp fields that are not in the migration; its
grading-scheme scope differs from the SDD's subject-based scheme; and some
summary/audit/transfer field names and status values differ. Confirm the
intended model before changing or extending the migration. If migration 001 has
already been applied to a shared database, preserve it and make corrections in
a new migration.
