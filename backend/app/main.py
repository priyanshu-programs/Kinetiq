from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.auth.router import router as auth_router
from app.config import settings
from app.middleware.errors import register_exception_handlers
from app.middleware.logging import RequestContextMiddleware
from app.ratelimit import limiter

app = FastAPI(title="AI Gym & Fitness Assistant", version="0.1.0")

# Rate limiting (auth + LLM routes).
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Request-id + logging.
app.add_middleware(RequestContextMiddleware)

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


@app.get("/health", tags=["system"])
def health():
    return {"status": "ok"}
