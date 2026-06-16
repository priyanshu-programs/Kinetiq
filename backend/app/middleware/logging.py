import uuid

from loguru import logger
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Attach a request id, log each request, and echo the id back in a header."""

    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        with logger.contextualize(request_id=request_id):
            logger.info("{} {}", request.method, request.url.path)
            response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response
