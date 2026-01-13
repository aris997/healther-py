# Operations Runbook (v0)

## Health checks
- API: add `/api/health` endpoint (todo); meanwhile check container health via docker compose status.
- DB: compose healthcheck uses `pg_isready`.
- Redis: logs should show `Ready to accept connections`.

## Worker
- Command: `python -m healther.workers`
- Queue: `health-checks`
- Scheduled jobs: RQ worker started with `with_scheduler=True` to run delayed jobs created by `queue.enqueue_in`.

## Common issues
- **Redis not reachable**: watcher creation may fail when enqueueing; ensure `redis` service is up.
- **JWT invalid**: returns 401; check `SECRET_KEY` consistency across api/worker.
- **Migrations**: currently rely on SQLModel `create_all` at startup; add Alembic for production.

## Future improvements
- Add `/api/health` endpoint.
- Add structured logging + metrics.
- Implement email delivery via SMTP or third-party provider.
