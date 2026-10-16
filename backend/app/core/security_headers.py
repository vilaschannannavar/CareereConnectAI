"""Security headers middleware enforcing OWASP-recommended HTTP security headers."""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Middleware that injects hardened security headers onto all HTTP responses."""

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)

        # 1. Prevent MIME-type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # 2. Prevent clickjacking in legacy browsers (frame-ancestors handles modern)
        response.headers["X-Frame-Options"] = "DENY"

        # 3. HTTP Strict Transport Security (HSTS)
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        # 4. Strict referrer policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # 5. Restrict sensitive browser features
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"

        # 6. Content Security Policy (CSP)
        if "Content-Security-Policy" not in response.headers:
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "img-src 'self' data:; "
                "style-src 'self' 'unsafe-inline'; "
                "script-src 'self' 'unsafe-inline'; "
                "font-src 'self'; "
                "frame-ancestors 'none';"
            )

        return response
