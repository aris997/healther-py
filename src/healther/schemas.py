"""Pydantic schemas for API requests and responses."""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr

from .models import HealthStatus, Role, WatchFrequency


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: uuid.UUID | None = None


class LoginRequest(BaseModel):
    username: EmailStr
    password: str


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class UserOut(BaseModel):
    id: uuid.UUID
    email: EmailStr
    full_name: Optional[str]

    model_config = ConfigDict(from_attributes=True)


class WorkspaceCreate(BaseModel):
    name: str
    is_public: bool = False


class WorkspaceOut(BaseModel):
    id: uuid.UUID
    name: str
    is_public: bool

    model_config = ConfigDict(from_attributes=True)


class WatcherCreate(BaseModel):
    name: str
    url: str
    expected_status: int = 200
    expected_body: str | None = None
    every_value: int = 15
    every_unit: WatchFrequency = WatchFrequency.minutes


class WatcherOut(BaseModel):
    id: uuid.UUID
    name: str
    url: str
    expected_status: int
    expected_body: str | None
    every_value: int
    every_unit: WatchFrequency

    model_config = ConfigDict(from_attributes=True)


class HealthEventOut(BaseModel):
    id: uuid.UUID
    status: HealthStatus
    response_status: int | None
    response_time_ms: float | None
    message: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MembershipOut(BaseModel):
    workspace_id: uuid.UUID
    user_id: uuid.UUID
    role: Role

    model_config = ConfigDict(from_attributes=True)
