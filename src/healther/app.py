"""Application factory for Healther FastAPI app."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import router
from .db import lifespan


def create_app() -> FastAPI:
    app = FastAPI(title="Healther", lifespan=lifespan, docs_url="/docs")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:4173",
            "http://127.0.0.1:4173",
        ],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(router)
    return app


app = create_app()
