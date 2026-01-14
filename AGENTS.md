# Agent Notes for healther-py

- **Env source of truth**: Use `POSTGRES_HOST/PORT/USER/PASSWORD/DB`, `REDIS_URL`, `SECRET_KEY` from `.env.docker` (or `.env`). `DATABASE_URL` is optional; if omitted the backend builds it from the `POSTGRES_*` vars.
- **DB URL builder**: See `src/healther/db.py::_normalized_url()`. It now prefers discrete `POSTGRES_*` env vars and only falls back to SQLite if none are set.
- **Redis**: Only RQ job data lives in Redis. Compose starts Redis with `--appendonly yes`, persisting to the `redis_data` volume. Losing the volume drops queued jobs but not application data (stored in Postgres).
- **Frontend**: Runs on nginx port 80 in container; mapped to `127.0.0.1:4173`. API base defaults to `http://localhost:8000` or `VITE_API_BASE_URL`.
- **Compose network**: All services share `healther-net` bridge; API/worker connect to DB via service name `db`.
