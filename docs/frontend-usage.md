# Frontend Usage

- Base URLs (default): API `http://localhost:8000/api/v1`, Frontend `http://localhost:4173`.
- Set `VITE_API_BASE_URL` in `frontend/.env` if the API runs elsewhere.

## Flows
- **Register/Login**: navigation buttons post to `/auth/register` and `/auth/token` under the `/api/v1` base.
- **Dashboard**: create workspaces (toggle public). Each user already has a personal workspace from backend auto-create.
- **Workspace detail**: add watchers (name, URL, expected status/body, cadence). Click a watcher to see recorded events. Public link is shown for sharing.
- **Public status**: `/public/:workspaceId` consumes `/public/workspaces/{id}/events` under `/api/v1` when the workspace is public.

## Build & Run
- Dev: `npm install && npm run dev` (Vite).
- Production: `npm run build`; served via nginx in `frontend/Dockerfile` (port 80 inside container, published to 4173 by compose).
