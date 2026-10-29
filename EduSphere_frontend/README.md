# EduSphere frontend

Vue 3 + Vite frontend with Vue Router. For complete setup, environment
configuration, backend commands, and database migration instructions, see the
repository [README](../README.md).

From this directory:

```powershell
npm ci
npm run dev
npm run build
npm run preview
```

Set `VITE_API_URL` in `.env` to the versioned API base URL (default:
`http://localhost:3000/api/v1`). The `/health` page checks the API and database
connection.
