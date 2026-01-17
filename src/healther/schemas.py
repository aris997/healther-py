"""Pydantic schemas for API requests and responses."""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr

from .models import HealthStatus, ProfileVisibility, Role, WatchFrequency


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
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    pronouns: Optional[str] = None
    city: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    website_url: Optional[str] = None
    profile_visibility: ProfileVisibility

    model_config = ConfigDict(from_attributes=True)


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    pronouns: Optional[str] = None
    city: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    website_url: Optional[str] = None
    profile_visibility: Optional[ProfileVisibility] = None


class WorkspaceCreate(BaseModel):
    name: str
    is_public: bool = False


class WorkspaceOut(BaseModel):
    id: uuid.UUID
    name: str
    is_public: bool

    model_config = ConfigDict(from_attributes=True)


class InviteMemberRequest(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: Role = Role.observer


class MembershipUpdate(BaseModel):
    role: Role


class WorkspaceMember(BaseModel):
    workspace_id: uuid.UUID
    user_id: uuid.UUID
    email: EmailStr
    full_name: Optional[str]
    role: Role

    model_config = ConfigDict(from_attributes=True)


class WatcherCreate(BaseModel):
    name: str
    url: str
    expected_status: int = 200
    expected_body: str | None = None
    every_value: int = 15
    every_unit: WatchFrequency = WatchFrequency.minutes


class WatcherUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    expected_status: Optional[int] = None
    expected_body: Optional[str] = None
    every_value: Optional[int] = None
    every_unit: Optional[WatchFrequency] = None


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
    watcher_id: uuid.UUID
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


class RecipientCreate(BaseModel):
    email: EmailStr
    display_name: Optional[str] = None
    is_active: bool = True


class RecipientUpdate(BaseModel):
    email: Optional[EmailStr] = None
    display_name: Optional[str] = None
    is_active: Optional[bool] = None


class RecipientOut(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    email: EmailStr
    display_name: Optional[str]
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
