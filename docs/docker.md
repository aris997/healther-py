# Docker & Local Run

## Prereqs
- Docker + docker-compose
- Python 3.11 if running locally without containers

## Quick start (compose)
```bash
docker compose up --build
```
Services:
- `db` (Postgres @ db:5432)
- `redis` (Redis @ redis:6379)
- `api` (FastAPI, http://localhost:8000)
- `worker` (RQ worker with scheduler)
- `frontend` (static site via Nginx, http://localhost:4173)
- `mailhog` (fake SMTP inbox, http://localhost:8025)

## Environment variables
- `DATABASE_URL` e.g. `postgresql+psycopg://healther:healther@db:5432/healther`
- `REDIS_URL` e.g. `redis://redis:6379/0`
- `SECRET_KEY` for JWT signing
- `SMTP_HOST`, `SMTP_PORT`, `MAIL_FROM` (for future email alerts)
- If `DATABASE_URL` is unset in local dev, the API falls back to SQLite `sqlite+aiosqlite:///./healther.db`

## Local dev without Docker
```bash
python -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
uvicorn main:app --reload
```
Run worker in another shell:
```bash
python -m healther.workers
```

## Tests
```bash
pytest
```
