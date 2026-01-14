# Healther PY

Healther monitors external services, records availability, and notifies workspaces when checks fail.

## Run locally
- `python -m venv .venv && source .venv/bin/activate`
- `pip install -e .[dev]` (requires internet)
- `uvicorn main:app --reload`
- Start worker: `python -m healther.workers`

## Docker
`docker compose up --build` (brings up Postgres, Redis, API, worker, frontend, Mailhog).
Env lives in `.env.docker` (`POSTGRES_*`, `REDIS_URL`, `SECRET_KEY`); API builds `DATABASE_URL` from those vars automatically.

## Docs
See `/docs` for architecture, API, auth roles, frontend design, and operations.
