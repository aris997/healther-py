# CLAUDE.md — AI Assistant Guide for healther-py

## Project Overview

Healther-py is a service monitoring platform that tracks external HTTP endpoint availability, records health metrics, and sends email alerts when services fail. It consists of a **FastAPI backend**, a **React (Vite) frontend**, and an **RQ worker** for background health checks and notifications.

## Repository Structure

```
src/healther/              # Backend Python package
  app.py                   # FastAPI app factory with CORS & lifespan
  config.py                # Pydantic settings (env-based configuration)
  db.py                    # Async SQLAlchemy engine & session management
  models.py                # SQLModel ORM models (User, Workspace, Watcher, etc.)
  schemas.py               # Pydantic request/response schemas
  security.py              # JWT creation/validation & password hashing
  notifications.py         # Email alert queuing & SMTP delivery
  workers.py               # RQ background job runner (health checks & emails)
  api/
    deps.py                # FastAPI dependencies (auth, session, role checks)
    routes.py              # All API endpoints (/auth, /workspaces, /watchers, etc.)
  services/
    auth.py                # User registration & login logic
    watchers.py            # Watcher CRUD, health check execution, scheduling

tests/
  conftest.py              # Pytest fixtures (async SQLite DB, mocked Redis)
  test_api.py              # API integration tests

frontend/                  # React 18 + Vite SPA
  src/
    App.jsx                # Main app with all routes and components
    api.js                 # Centralized fetch-based API client
    auth.jsx               # Auth context provider (useAuth hook)
    styles.css             # Global CSS with light/dark theme support
  package.json
  vite.config.js
  Dockerfile               # Frontend container (Nginx)

docs/                      # Detailed documentation
  architecture.md          # System design & data model
  auth.md                  # Auth & authorization details
  api.md                   # API endpoint reference
  operations.md            # Ops runbook
  docker.md                # Docker setup guide

main.py                    # ASGI entrypoint (imports app from healther.app)
pyproject.toml             # Python project config, deps, ruff, pytest settings
docker-compose.yml         # Local dev: Postgres, Redis, API, worker, frontend, Mailhog
Dockerfile                 # Backend container
.github/workflows/ci.yml  # GitHub Actions CI pipeline
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend framework | FastAPI + Uvicorn |
| ORM | SQLModel (SQLAlchemy + Pydantic) |
| Database | PostgreSQL (primary), SQLite (fallback for dev/test) |
| Job queue | Redis + RQ |
| Auth | JWT (HS256) via python-jose, PBKDF2-SHA256 passwords |
| HTTP client | httpx (async) |
| Frontend | React 18 + React Router v6 |
| Build tool | Vite |
| Package manager | uv (with uv.lock) |
| Linting/formatting | Ruff |
| Testing | pytest + pytest-asyncio (backend), Vitest (frontend) |
| CI/CD | GitHub Actions |

## Common Commands

### Backend

```bash
# Install dependencies (dev)
pip install -e .[dev]

# Run API server with hot reload
uvicorn main:app --reload

# Run background worker
python -m healther.workers

# Run backend tests
pytest

# Lint & format
ruff check src/ tests/
ruff format src/ tests/
```

### Frontend

```bash
cd frontend
npm install
npm run dev          # Dev server
npm run build        # Production build
npm run test         # Run Vitest tests
```

### Docker (full stack)

```bash
docker compose up --build    # Starts Postgres, Redis, API, worker, frontend, Mailhog
```

Services exposed locally:
- API: `http://localhost:8000`
- Frontend: `http://localhost:4173`
- Mailhog UI: `http://localhost:8025`
- Postgres: `localhost:5433`
- Redis: `localhost:6379`

## Configuration

All configuration is via environment variables (see `.env.example`):

| Variable | Purpose | Default |
|----------|---------|---------|
| `POSTGRES_HOST/PORT/USER/PASSWORD/DB` | Database connection | `db`/`5432`/`healther`/`healther`/`healther` |
| `DATABASE_URL` | Optional override (uses POSTGRES_* vars if omitted) | Built from POSTGRES_* |
| `REDIS_URL` | Redis connection for RQ | `redis://redis:6379/0` |
| `SECRET_KEY` | JWT signing key | `dev-secret-change-me` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT token lifetime | `60` |
| `SMTP_HOST` / `SMTP_PORT` / `MAIL_FROM` | Email delivery | `mailhog`/`1025`/`healther@example.com` |

The DB URL builder in `src/healther/db.py::_normalized_url()` prefers discrete `POSTGRES_*` vars, falls back to SQLite if none are set.

## Testing

### Backend tests

- Framework: **pytest** with **pytest-asyncio** (strict mode)
- Tests use an **in-memory SQLite** database (no Postgres required)
- Redis queue is mocked with a `_DummyQueue` in `tests/conftest.py`
- Run: `pytest` from repo root

### Frontend tests

- Framework: **Vitest** with **@testing-library/react** and **jsdom**
- Run: `npm run test` from `frontend/`

### CI pipeline

GitHub Actions runs on every push (`.github/workflows/ci.yml`):
1. Backend: Python 3.11 + `pip install .[dev]` + `pytest`
2. Frontend: Node 22 + `npm install` + `npm run test` + `npm run build`

## Linting & Formatting

**Ruff** is the sole linter/formatter. Configuration in `pyproject.toml`:

- Line length: **101**
- Target: **Python 3.14**
- Lint rules: **E** (pycodestyle errors), **F** (pyflakes), **I** (isort)
- E501 (line too long) is **ignored** — the 101-char limit is advisory
- Format: double quotes, space indentation

Run before committing:
```bash
ruff check src/ tests/        # Lint
ruff check --fix src/ tests/  # Lint with auto-fix
ruff format src/ tests/       # Format
```

## Architecture & Key Patterns

### Backend

- **Async-first**: All DB operations, HTTP calls, and API handlers are async
- **Dependency injection**: FastAPI `Depends()` for DB sessions, current user, workspace role checks
- **Service layer**: Business logic lives in `src/healther/services/` — routes delegate to services
- **Role-based access**: Owner > Admin > Observer roles enforced at endpoint level via `get_workspace_role()` and `_require_admin_or_owner()`
- **Background jobs**: RQ workers process health checks and email alerts on separate queues (`health-checks`, `email-alerts`)
- **Auto-scheduling**: After each health check, the next one is enqueued with configurable cadence (minutes/hours/days/weeks)
- **Table creation**: Uses `SQLModel.metadata.create_all` on startup (no migration tool yet — Alembic is a known TODO)

### Frontend

- **Single-file app**: Most UI is in `App.jsx` (~1400 lines) with embedded components
- **Auth context**: `useAuth()` hook via React Context — token stored in memory (not localStorage)
- **Centralized API client**: `api.js` wraps fetch with Bearer token injection
- **CSS theming**: Light/dark themes via `data-theme` attribute and CSS variables in `styles.css`
- **Custom visualizations**: SVG-based latency graphs and 90-day uptime bar charts (no charting library)

### Data Model

- **User** — email, hashed password, profile fields
- **Workspace** — name, is_public flag; users join via Membership (owner/admin/observer)
- **ServiceWatcher** — URL to monitor, expected status code, optional body match, check cadence
- **HealthEvent** — status (healthy/degraded/down), response code, latency, error message, timestamp
- **NotificationRecipient** — email addresses that receive alerts per workspace

All primary keys are UUID4.

## Code Conventions

- **Naming**: snake_case for functions/variables, CamelCase for classes/models/schemas
- **Private functions**: prefixed with `_` (e.g., `_normalized_url`, `_require_admin_or_owner`)
- **Schemas**: Named as `<Entity>Create`, `<Entity>Update`, `<Entity>Out` (e.g., `WatcherCreate`, `WatcherOut`)
- **Error handling**: Raise `HTTPException` with appropriate status codes and detail messages
- **Imports**: Organized by ruff's isort (stdlib, third-party, local)
- **Type hints**: Used throughout via Pydantic models and SQLModel fields
- **No pre-commit hooks**: Rely on CI and manual ruff runs

## API Structure

All endpoints are under `/api/v1/`:

- `POST /auth/register` — Create account (auto-creates personal workspace)
- `POST /auth/token` — Login, returns JWT
- `GET /me`, `PATCH /me` — Current user profile
- `POST /workspaces`, `GET /workspaces` — Workspace CRUD
- `GET/POST/PATCH/DELETE` — Members, watchers, events, recipients under workspace routes
- `GET /public/workspaces/{id}/*` — Unauthenticated public status page endpoints

## Known Limitations

- No database migration tool (uses `create_all` — Alembic is planned)
- No structured logging or distributed tracing (OpenTelemetry noted as TODO)
- Email delivery is dev-only via Mailhog (production SMTP not configured)
- No `/api/v1/health` endpoint yet
- Frontend is a single large file (`App.jsx`) — component extraction is a future refactor
