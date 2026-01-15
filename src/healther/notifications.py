"""Email notification jobs and queue helpers."""

from __future__ import annotations

import asyncio
import logging
import smtplib
import uuid
from email.message import EmailMessage

from redis import Redis
from rq import Queue
from sqlmodel import select

from .config import settings
from .db import SessionLocal
from .models import HealthEvent, HealthStatus, NotificationRecipient, ServiceWatcher, Workspace

logger = logging.getLogger(__name__)

redis_conn = Redis.from_url(settings.redis_url)
queue = Queue("email-alerts", connection=redis_conn)


def enqueue_alert(event_id: uuid.UUID) -> None:
    """Enqueue an email alert for a health event."""
    queue.enqueue("healther.notifications.send_alerts", event_id)


def send_alerts(event_id: uuid.UUID) -> None:
    """RQ entrypoint: send alert emails for the provided event id."""
    asyncio.run(_send_alerts_async(event_id))


async def _send_alerts_async(event_id: uuid.UUID) -> None:
    async with SessionLocal() as session:
        event = await session.get(HealthEvent, event_id)
        if not event or event.status == HealthStatus.healthy:
            return
        watcher = await session.get(ServiceWatcher, event.watcher_id)
        if not watcher:
            return
        workspace = await session.get(Workspace, watcher.workspace_id)
        if not workspace:
            return
        result = await session.exec(
            select(NotificationRecipient).where(
                NotificationRecipient.workspace_id == watcher.workspace_id,
                NotificationRecipient.is_active.is_(True),
            )
        )
        recipients = result.all()
        if not recipients:
            return

        subject = f"[Healther] {watcher.name} is {event.status.value.upper()}"
        lines = [
            f"Workspace: {workspace.name}",
            f"Service: {watcher.name}",
            f"URL: {watcher.url}",
            f"Status: {event.status.value}",
            f"Expected status: {watcher.expected_status}",
            f"Observed status: {event.response_status or 'N/A'}",
            f"Latency (ms): {event.response_time_ms or 'N/A'}",
            f"Message: {event.message or 'N/A'}",
            f"Event time: {event.created_at.isoformat()}",
        ]
        body = "\n".join(lines)
        emails = [recipient.email for recipient in recipients]
        _send_email(emails, subject, body)


def _send_email(recipients: list[str], subject: str, body: str) -> None:
    message = EmailMessage()
    message["From"] = settings.mail_from
    message["To"] = ", ".join(recipients)
    message["Subject"] = subject
    message.set_content(body)

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
            server.send_message(message)
    except OSError as exc:
        logger.exception("Failed to send alert email: %s", exc)
