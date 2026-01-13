"""Background job worker functions."""

import asyncio
import logging
import os
import uuid

from redis import Redis
from rq import Worker
from rq.connections import Connection
from sqlmodel import select

from .db import SessionLocal
from .models import ServiceWatcher
from .services.watchers import perform_check

logger = logging.getLogger(__name__)


def run_check(watcher_id: uuid.UUID):
    """RQ entrypoint: run a single check for the given watcher id."""
    asyncio.run(_run_check_async(watcher_id))


async def _run_check_async(watcher_id: uuid.UUID):
    async with SessionLocal() as session:
        result = await session.exec(select(ServiceWatcher).where(ServiceWatcher.id == watcher_id))
        watcher = result.first()
        if watcher:
            await perform_check(watcher, session)


def main():
    redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
    redis_conn = Redis.from_url(redis_url)
    with Connection(redis_conn):
        worker = Worker(["health-checks"])
        worker.work(with_scheduler=True)


if __name__ == "__main__":
    main()
