import httpx
import pytest
import pytest_asyncio
from sqlmodel import Session, SQLModel, create_engine

from healther.app import create_app
from healther.db import get_session as app_get_session
from healther.services import watchers as watcher_service


class _DummyQueue:
    def enqueue(self, *_, **__):
        return None

    def enqueue_in(self, *_, **__):
        return None


class AsyncSessionProxy:
    """Async-ish proxy that mimics AsyncSession using a sync Session underneath."""

    def __init__(self, sync_session: Session):
        self._sync = sync_session

    # matches AsyncSession exec signature (awaitable)
    async def exec(self, stmt):
        return self._sync.exec(stmt)

    # AsyncSession.add is synchronous, so mirror that
    def add(self, obj):
        self._sync.add(obj)

    async def commit(self):
        self._sync.commit()

    async def refresh(self, obj):
        self._sync.refresh(obj)

    async def get(self, *args, **kwargs):
        return self._sync.get(*args, **kwargs)

    async def close(self):
        self._sync.close()

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        await self.close()


@pytest_asyncio.fixture
async def app(monkeypatch, tmp_path):
    db_path = tmp_path / "test.db"
    sync_engine = create_engine(f"sqlite:///{db_path}")
    SQLModel.metadata.create_all(sync_engine)

    def sync_session():
        return Session(sync_engine)

    async def override_get_session():
        sync = sync_session()
        proxy = AsyncSessionProxy(sync)
        try:
            yield proxy
        finally:
            await proxy.close()

    # bypass Redis queue
    monkeypatch.setattr(watcher_service, "queue", _DummyQueue())

    # disable default lifespan create_all
    from contextlib import asynccontextmanager

    import healther.app as app_module
    import healther.db as db_module

    @asynccontextmanager
    async def noop_lifespan(app):
        yield

    monkeypatch.setattr(db_module, "lifespan", noop_lifespan)
    monkeypatch.setattr(app_module, "lifespan", noop_lifespan)

    application = create_app()
    application.dependency_overrides[app_get_session] = override_get_session
    return application


@pytest.mark.anyio
async def test_register_login_and_workspace_flow(app):
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/auth/register", json={"email": "alice@example.com", "password": "secret123"}
        )
        assert resp.status_code == 201, resp.text
        user_id = resp.json()["id"]

        token_resp = await client.post(
            "/api/auth/token", json={"username": "alice@example.com", "password": "secret123"}
        )
        assert token_resp.status_code == 200, token_resp.text
        token = token_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        me_resp = await client.get("/api/me", headers=headers)
        assert me_resp.status_code == 200
        assert me_resp.json()["id"] == user_id

        ws_resp = await client.post(
            "/api/workspaces", json={"name": "Team A", "is_public": True}, headers=headers
        )
        assert ws_resp.status_code == 201, ws_resp.text
        workspace_id = ws_resp.json()["id"]

        watcher_resp = await client.post(
            f"/api/workspaces/{workspace_id}/watchers",
            json={"name": "Homepage", "url": "https://example.com", "expected_status": 200},
            headers=headers,
        )
        assert watcher_resp.status_code == 201, watcher_resp.text
        watcher_id = watcher_resp.json()["id"]

        events_resp = await client.get(f"/api/watchers/{watcher_id}/events", headers=headers)
        assert events_resp.status_code == 200
        assert events_resp.json() == []
