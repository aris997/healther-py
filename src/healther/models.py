"""Database models using SQLModel for type-safe SQLAlchemy ORM."""

import datetime as dt
import uuid
from enum import Enum

from sqlmodel import Field, Relationship, SQLModel


class Role(str, Enum):
    owner = "owner"
    admin = "admin"
    observer = "observer"


class User(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, nullable=False)
    email: str = Field(unique=True, index=True)
    full_name: str | None = None
    hashed_password: str
    created_at: dt.datetime = Field(
        default_factory=lambda: dt.datetime.now(dt.timezone.utc), nullable=False
    )

    memberships: list["Membership"] = Relationship(back_populates="user")


class Workspace(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, nullable=False)
    name: str
    is_public: bool = False
    created_at: dt.datetime = Field(
        default_factory=lambda: dt.datetime.now(dt.timezone.utc), nullable=False
    )

    memberships: list["Membership"] = Relationship(back_populates="workspace")
    watchers: list["ServiceWatcher"] = Relationship(back_populates="workspace")


class Membership(SQLModel, table=True):
    workspace_id: uuid.UUID = Field(foreign_key="workspace.id", primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", primary_key=True)
    role: Role = Field(default=Role.observer)

    workspace: Workspace = Relationship(back_populates="memberships")
    user: User = Relationship(back_populates="memberships")


class WatchFrequency(str, Enum):
    minutes = "minutes"
    hours = "hours"
    days = "days"
    weeks = "weeks"


class ServiceWatcher(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    workspace_id: uuid.UUID = Field(foreign_key="workspace.id")
    name: str
    url: str
    expected_status: int = 200
    expected_body: str | None = None
    every_value: int = 15
    every_unit: WatchFrequency = Field(default=WatchFrequency.minutes)
    created_at: dt.datetime = Field(default_factory=lambda: dt.datetime.now(dt.timezone.utc))

    workspace: Workspace = Relationship(back_populates="watchers")
    events: list["HealthEvent"] = Relationship(back_populates="watcher")


class HealthStatus(str, Enum):
    healthy = "healthy"
    degraded = "degraded"
    down = "down"


class HealthEvent(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    watcher_id: uuid.UUID = Field(foreign_key="servicewatcher.id")
    status: HealthStatus
    response_status: int | None = None
    response_time_ms: float | None = None
    created_at: dt.datetime = Field(default_factory=lambda: dt.datetime.now(dt.timezone.utc))
    message: str | None = None

    watcher: ServiceWatcher = Relationship(back_populates="events")
