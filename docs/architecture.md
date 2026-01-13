# Architecture

## High level
- **Backend**: FastAPI + SQLModel for API and data models; async Postgres via psycopg3; Redis + RQ queue for background health checks and email fan-out later.
- **Worker**: RQ worker (`python -m healther.workers`) consuming `health-checks` queue; re-enqueues checks based on watcher cadence.
- **Database**: Postgres stores users, workspaces, memberships, watchers, and health events (default local fallback uses SQLite via `sqlite+aiosqlite:///./healther.db`); Redis stores job queues and schedules.
- **Frontend**: Vite + React single-page app served via Nginx in production container; consumes backend API.
- **Container orchestration**: docker-compose spins up db, redis, api, worker, frontend, mailhog.

## Data model (tables)
- `user` – id, email (unique), full_name, hashed_password, created_at
- `workspace` – id, name, is_public, created_at
- `membership` – composite key (workspace_id, user_id), role ∈ {owner, admin, observer}
- `servicewatcher` – id, workspace_id, name, url, expected_status, expected_body?, every_value, every_unit (minutes|hours|days|weeks), timestamps
- `healthevent` – id, watcher_id, status ∈ {healthy, degraded, down}, response_status?, response_time_ms?, message?, created_at

## AuthN / AuthZ
- JWT bearer tokens (HS256) with configurable expiry (default 60 minutes).
- Passwords hashed with bcrypt.
- Workspace roles enforced in API via dependency `get_workspace_role`.

## Request flow
1. User authenticates to get JWT.
2. User creates workspace; becomes owner.
3. Owner/admin creates watcher → API enqueues first job to RQ.
4. Worker fetches watcher, performs HTTP GET, records `HealthEvent`, and schedules next run using watcher cadence.
5. Public workspace endpoint exposes recent events for public status pages.

## Failure handling (current)
- Network errors captured as `HealthStatus.down` with message.
- Redis or DB failures bubble up as 500; add retry/backoff later.

## Observability (next steps)
- Add structured logging, metrics (Prometheus), and alert email pipeline.
- Add request tracing using `opentelemetry-instrumentation-fastapi`.
