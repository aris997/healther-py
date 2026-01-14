"""Service watchers CRUD and health check enqueueing."""

import uuid

import httpx
from fastapi import HTTPException
from redis import Redis
from rq import Queue
from sqlmodel import select

from ..config import settings
from ..models import HealthEvent, HealthStatus, Role, ServiceWatcher, WatchFrequency

# Single Redis connection and queue used by API to enqueue health checks
redis_conn = Redis.from_url(settings.redis_url)
queue = Queue("health-checks", connection=redis_conn)


async def create_watcher(workspace_id: uuid.UUID, data, role: Role, session):
    """Create a watcher and enqueue its first check."""
    if role not in (Role.owner, Role.admin):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    watcher = ServiceWatcher(workspace_id=workspace_id, **data.model_dump())
    session.add(watcher)
    await session.commit()
    await session.refresh(watcher)
    queue.enqueue("healther.workers.run_check", watcher.id)
    return watcher


async def list_watchers(workspace_id: uuid.UUID, session):
    result = await session.exec(
        select(ServiceWatcher).where(ServiceWatcher.workspace_id == workspace_id)
    )
    return result.all()


async def record_event(
    watcher_id: uuid.UUID,
    status: HealthStatus,
    response_status: int | None,
    response_time: float | None,
    message: str | None,
    session,
):
    event = HealthEvent(
        watcher_id=watcher_id,
        status=status,
        response_status=response_status,
        response_time_ms=response_time,
        message=message,
    )
    session.add(event)
    await session.commit()
    return event


async def perform_check(watcher: ServiceWatcher, session):
    """Perform a single HTTP check for the watcher and persist a HealthEvent."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(watcher.url)
            elapsed_ms = response.elapsed.total_seconds() * 1000
            if response.status_code != watcher.expected_status:
                await record_event(
                    watcher.id,
                    HealthStatus.down,
                    response.status_code,
                    elapsed_ms,
                    "Unexpected status",
                    session,
                )
            elif watcher.expected_body and watcher.expected_body not in response.text:
                await record_event(
                    watcher.id,
                    HealthStatus.degraded,
                    response.status_code,
                    elapsed_ms,
                    "Body mismatch",
                    session,
                )
            else:
                await record_event(
                    watcher.id, HealthStatus.healthy, response.status_code, elapsed_ms, None, session
                )
    except httpx.RequestError as exc:
        await record_event(watcher.id, HealthStatus.down, None, None, f"Error: {exc}", session)

    # schedule next run
    queue.enqueue_in(_interval_as_timedelta(watcher), "healther.workers.run_check", watcher.id)


def _interval_as_timedelta(watcher: ServiceWatcher):
    from datetime import timedelta

    if watcher.every_unit == WatchFrequency.minutes:
        return timedelta(minutes=watcher.every_value)
    if watcher.every_unit == WatchFrequency.hours:
        return timedelta(hours=watcher.every_value)
    if watcher.every_unit == WatchFrequency.days:
        return timedelta(days=watcher.every_value)
    if watcher.every_unit == WatchFrequency.weeks:
        return timedelta(weeks=watcher.every_value)
    return timedelta(minutes=15)
