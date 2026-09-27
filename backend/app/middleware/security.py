from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

_SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "X-XSS-Protection": "0",
}


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Set baseline security headers on every response. No CSP — this is a
    JSON API; the SPA is served separately and owns its own CSP."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        for key, value in _SECURITY_HEADERS.items():
            response.headers[key] = value
        return response
