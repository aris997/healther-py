"""FastAPI dependencies for auth and DB session."""

import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlmodel import select

from ..db import get_session
from ..models import Membership, Role, User
from ..schemas import TokenData
from ..security import decode_token


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")


async def get_current_user(token: str = Depends(oauth2_scheme), session=Depends(get_session)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        if payload is None:
            raise credentials_exception
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        token_data = TokenData(user_id=uuid.UUID(user_id))
    except (JWTError, ValueError):
        raise credentials_exception

    result = await session.exec(select(User).where(User.id == token_data.user_id))
    user = result.first()
    if user is None:
        raise credentials_exception
    return user


async def get_workspace_role(workspace_id: uuid.UUID, current_user: User = Depends(get_current_user), session=Depends(get_session)) -> Role:
    result = await session.exec(
        select(Membership.role).where(Membership.workspace_id == workspace_id, Membership.user_id == current_user.id)
    )
    role = result.first()
    if role is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this workspace")
    return role
