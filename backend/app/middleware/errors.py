from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from loguru import logger
from starlette.exceptions import HTTPException as StarletteHTTPException


def _envelope(code: str, message: str, **extra) -> dict:
    body = {"error": {"code": code, "message": message}}
    if extra:
        body["error"].update(extra)
    return body


def register_exception_handlers(app: FastAPI) -> None:
    """Install handlers that return a uniform ``{error:{code,message}}`` envelope."""

    @app.exception_handler(RequestValidationError)
    async def validation_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=_envelope("validation_error", "Request validation failed", details=exc.errors()),
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_handler(request: Request, exc: StarletteHTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content=_envelope("http_error", str(exc.detail)),
        )

    @app.exception_handler(Exception)
    async def unhandled_handler(request: Request, exc: Exception):
        request_id = getattr(request.state, "request_id", "-")
        logger.exception("Unhandled error [request_id={}]: {}", request_id, exc)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=_envelope(
                "internal_error",
                "An unexpected error occurred.",
                request_id=request_id,
            ),
        )
