"""Authentication service functions."""

from fastapi import Depends, HTTPException, status
from sqlmodel import select

from ..db import get_session
from ..models import Membership, Role, User, Workspace
from ..schemas import LoginRequest, Token, UserCreate
from ..security import create_access_token, hash_password, verify_password


async def register_user(user_data: UserCreate, session=Depends(get_session)) -> User:
    """Create a new user, personal workspace, and owner membership."""
    existing = await session.exec(select(User).where(User.email == user_data.email))
    if existing.first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(email=user_data.email, full_name=user_data.full_name, hashed_password=hash_password(user_data.password))
    session.add(user)
    await session.commit()
    await session.refresh(user)

    workspace = Workspace(name=f"{user.email} workspace", is_public=False)
    session.add(workspace)
    await session.commit()
    await session.refresh(workspace)

    membership = Membership(user_id=user.id, workspace_id=workspace.id, role=Role.owner)
    session.add(membership)
    await session.commit()
    return user


async def login_for_access_token(login: LoginRequest, session=Depends(get_session)) -> Token:
    """Authenticate a user via username/password and return a JWT access token."""
    result = await session.exec(select(User).where(User.email == login.username))
    user = result.first()
    if not user or not verify_password(login.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    access_token = create_access_token({"sub": str(user.id)})
    return Token(access_token=access_token)
