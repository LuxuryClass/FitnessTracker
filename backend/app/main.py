from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.config import settings
from app.core.database import close_database_connection
from app.core.redis import close_redis_connection
from app.routers import api_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield
    await close_redis_connection()
    await close_database_connection()


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name, lifespan=lifespan)
    app.include_router(api_router)
    return app


app = create_app()
