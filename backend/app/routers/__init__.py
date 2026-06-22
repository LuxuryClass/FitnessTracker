from fastapi import APIRouter

from app.core.config import settings
from app.routers.auth import router as auth_router
from app.routers.exercises import router as exercises_router
from app.routers.guide import router as guide_router
from app.routers.notifications import router as notifications_router
from app.routers.users import router as users_router
from app.routers.workouts import router as workouts_router
from app.routers.workout_sessions import router as workout_sessions_router
from app.routers.workout_templates import router as workout_templates_router


api_router = APIRouter(prefix=settings.api_prefix)
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(notifications_router)
api_router.include_router(exercises_router)
api_router.include_router(guide_router)
api_router.include_router(workouts_router)
api_router.include_router(workout_sessions_router)
api_router.include_router(workout_templates_router)
