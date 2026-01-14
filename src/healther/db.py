"""Database engine and session utilities."""

from contextlib import asynccontextmanager
import asyncio

from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.exc import OperationalError
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

from .config import settings


def _normalized_url(raw_url: str) -> str:
    """Ensure the SQLAlchemy URL is async-ready and uses psycopg when talking to Postgres."""
    if raw_url:
        url = make_url(raw_url)
        if url.drivername in {"psycopg", "postgresql"}:
            url = url.set(drivername="postgresql+psycopg")
        return str(url)

    # Build from discrete POSTGRES_* settings as single source of truth
    host = settings.postgres_host
    port = settings.postgres_port
    user = settings.postgres_user
    password = settings.postgres_password
    dbname = settings.postgres_db
    if host and user and dbname:
        return f"postgresql+psycopg://{user}:{password}@{host}:{port}/{dbname}"

    # Final fallback
    return "sqlite+aiosqlite:///./healther.db"


database_url = _normalized_url(settings.database_url)
engine = create_async_engine(database_url, echo=False)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


@asynccontextmanager
async def lifespan(app):
    # Retry a few times in case the DB container is still starting.
    for attempt in range(10):
        try:
            async with engine.begin() as conn:
                await conn.run_sync(SQLModel.metadata.create_all)
            break
        except OperationalError:
            if attempt == 9:
                raise
            await asyncio.sleep(1.5)
    yield


async def get_session() -> AsyncSession:
    async with SessionLocal() as session:
        yield session
