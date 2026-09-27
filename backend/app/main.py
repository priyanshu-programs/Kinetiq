from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.admin.router import router as admin_router
from app.auth.router import router as auth_router
from app.chat import llm
from app.chat.router import router as chat_router
from app.config import settings, validate_runtime_settings
from app.dashboard.router import router as dashboard_router
from app.diet.router import router as diet_router
from app.habits.router import router as habits_router
from app.iot.router import router as iot_router
from app.iot.ws import stop_simulator
from app.middleware.errors import register_exception_handlers
from app.middleware.logging import RequestContextMiddleware
from app.middleware.security import SecurityHeadersMiddleware
from app.performance.router import router as performance_router
from app.ratelimit import limiter
from app.reco.router import router as reco_router
from app.workouts.router import router as workouts_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Runs only for the live app. Unit tests use a bare TestClient (no context
    # manager), so this block never fires there.
    validate_runtime_settings(settings)
    # Confirm the configured models are in the catalogue at zero price, so the
    # first user request doesn't pay for that check. Failing closed here means
    # labelled basic replies, never a paid call.
    if settings.openrouter_api_key:
        llm.candidate_models(force=True)
    # The IoT simulator loop starts on the first WebSocket connection; nothing
    # to start here. Nudges are caught up on the user's own visits.
    yield
    await stop_simulator()


app = FastAPI(title="Kinetiq", version="0.1.0", lifespan=lifespan)

# Rate limiting (auth + LLM routes).
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Request-id + logging.
app.add_middleware(RequestContextMiddleware)

# Baseline security headers on every response.
app.add_middleware(SecurityHeadersMiddleware)

# CORS for the Vite dev server.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Uniform error envelope.
register_exception_handlers(app)

# Routers.
app.include_router(auth_router)
app.include_router(workouts_router)
app.include_router(performance_router)
app.include_router(diet_router)
app.include_router(chat_router)
app.include_router(habits_router)
app.include_router(iot_router)
app.include_router(reco_router)
app.include_router(dashboard_router)
app.include_router(admin_router)


@app.get("/health", tags=["system"])
def health():
    # llm_enabled answers "why am I getting basic replies?" in one request.
    return {"status": "ok", "llm_enabled": llm.llm_enabled()}
