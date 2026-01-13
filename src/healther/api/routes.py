"""API routes for auth, workspaces, watchers, and public status."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select

from ..api.deps import get_current_user, get_workspace_role
from ..db import get_session
from ..models import HealthEvent, Membership, Role, ServiceWatcher, User, Workspace
from ..schemas import (
    HealthEventOut,
    LoginRequest,
    Token,
    UserCreate,
    UserOut,
    WorkspaceCreate,
    WorkspaceOut,
    WatcherCreate,
    WatcherOut,
)
from ..services import auth as auth_service
from ..services import watchers as watcher_service

router = APIRouter(prefix="/api")


@router.post("/auth/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(user: UserCreate, session=Depends(get_session)):
    created = await auth_service.register_user(session=session, user_data=user)
    return created


@router.post("/auth/token", response_model=Token)
async def login_for_access_token(payload: LoginRequest, session=Depends(get_session)):
    return await auth_service.login_for_access_token(payload, session)


@router.get("/me", response_model=UserOut)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/workspaces", response_model=WorkspaceOut, status_code=status.HTTP_201_CREATED)
async def create_workspace(data: WorkspaceCreate, current_user: User = Depends(get_current_user), session=Depends(get_session)):
    workspace = Workspace(name=data.name, is_public=data.is_public)
    session.add(workspace)
    await session.commit()
    await session.refresh(workspace)

    membership = Membership(workspace_id=workspace.id, user_id=current_user.id, role=Role.owner)
    session.add(membership)
    await session.commit()
    return workspace


@router.get("/workspaces", response_model=list[WorkspaceOut])
async def list_workspaces(current_user: User = Depends(get_current_user), session=Depends(get_session)):
    result = await session.exec(
        select(Workspace).join(Membership, Membership.workspace_id == Workspace.id).where(Membership.user_id == current_user.id)
    )
    return result.all()


@router.post("/workspaces/{workspace_id}/watchers", response_model=WatcherOut, status_code=status.HTTP_201_CREATED)
async def create_watcher(workspace_id: uuid.UUID, data: WatcherCreate, role: Role = Depends(get_workspace_role), session=Depends(get_session)):
    watcher = await watcher_service.create_watcher(workspace_id, data, role, session)
    return watcher


@router.get("/workspaces/{workspace_id}/watchers", response_model=list[WatcherOut])
async def list_watchers(workspace_id: uuid.UUID, current_user: User = Depends(get_current_user), session=Depends(get_session)):
    # ensure membership
    await get_workspace_role(workspace_id, current_user, session)
    return await watcher_service.list_watchers(workspace_id, session)


@router.get("/watchers/{watcher_id}/events", response_model=list[HealthEventOut])
async def list_events(watcher_id: uuid.UUID, current_user: User = Depends(get_current_user), session=Depends(get_session)):
    result = await session.exec(select(ServiceWatcher).where(ServiceWatcher.id == watcher_id))
    watcher = result.first()
    if not watcher:
        raise HTTPException(status_code=404, detail="Watcher not found")
    await get_workspace_role(watcher.workspace_id, current_user, session)
    events = await session.exec(select(HealthEvent).where(HealthEvent.watcher_id == watcher_id))
    return events.all()


@router.get("/public/workspaces/{workspace_id}/events", response_model=list[HealthEventOut])
async def public_events(workspace_id: uuid.UUID, session=Depends(get_session)):
    workspace = await session.get(Workspace, workspace_id)
    if not workspace or not workspace.is_public:
        raise HTTPException(status_code=404, detail="Workspace not public")
    events = await session.exec(select(HealthEvent).join(ServiceWatcher).where(ServiceWatcher.workspace_id == workspace_id))
    return events.all()
