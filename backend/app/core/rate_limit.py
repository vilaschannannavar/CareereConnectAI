"""In-memory sliding window rate limiter for security-sensitive endpoints."""
import time
from typing import Dict, List
from fastapi import Request, HTTPException, status


class SlidingWindowRateLimiter:
    """Sliding-window in-memory rate limiter per client IP address."""

    def __init__(self, requests_limit: int = 10, window_seconds: int = 60):
        self.requests_limit = requests_limit
        self.window_seconds = window_seconds
        self._records: Dict[str, List[float]] = {}

    def _clean_old_records(self, key: str, current_time: float) -> None:
        """Prune timestamps older than window_seconds."""
        threshold = current_time - self.window_seconds
        self._records[key] = [t for t in self._records.get(key, []) if t > threshold]

    def check(self, request: Request, endpoint_key: str = "default") -> None:
        """Check rate limit for the requesting client. Raises 429 if exceeded."""
        client_ip = (
            request.headers.get("x-forwarded-for", "").split(",")[0].strip()
            or (request.client.host if request.client else "unknown")
        )
        key = f"{client_ip}:{endpoint_key}"
        now = time.time()

        self._clean_old_records(key, now)
        timestamps = self._records.setdefault(key, [])

        if len(timestamps) >= self.requests_limit:
            oldest = timestamps[0]
            retry_after = max(1, int(self.window_seconds - (now - oldest)))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many requests. Please wait {retry_after} seconds before trying again.",
                headers={"Retry-After": str(retry_after)}
            )

        timestamps.append(now)

    def reset(self) -> None:
        """Reset all rate limit tracking (useful in test suites)."""
        self._records.clear()


# Global rate limiter instances for security and cost sensitive endpoints
auth_rate_limiter = SlidingWindowRateLimiter(requests_limit=10, window_seconds=60)
upload_rate_limiter = SlidingWindowRateLimiter(requests_limit=10, window_seconds=60)
import_rate_limiter = SlidingWindowRateLimiter(requests_limit=10, window_seconds=60)
analyze_rate_limiter = SlidingWindowRateLimiter(requests_limit=20, window_seconds=60)
generate_rate_limiter = SlidingWindowRateLimiter(requests_limit=20, window_seconds=60)
