import time
from dataclasses import dataclass
import httpx
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.core.config import get_settings

settings = get_settings()
bearer_scheme = HTTPBearer()

# Persistent HTTP client — reuses TCP connections (no TLS handshake per request)
_http_client = httpx.AsyncClient(timeout=10.0, http2=False)

# Token cache: {token: (CurrentUser, expires_at_monotonic)}
_token_cache: dict[str, tuple["CurrentUser", float]] = {}
_CACHE_TTL = 300  # cache each verified token for 5 minutes


@dataclass
class CurrentUser:
    id: str
    email: str | None = None
    full_name: str | None = None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(bearer_scheme),
) -> CurrentUser:
    token = credentials.credentials
    now = time.monotonic()

    # Return cached result if still valid — skips Supabase HTTP round-trip
    cached = _token_cache.get(token)
    if cached and cached[1] > now:
        return cached[0]

    try:
        resp = await _http_client.get(
            f"{settings.supabase_url}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": settings.supabase_anon_key,
            },
        )
        if resp.status_code != 200:
            _token_cache.pop(token, None)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            )
        data = resp.json()
        user_id = data.get("id")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        email = data.get("email")
        full_name = (
            data.get("user_metadata", {}).get("full_name")
            or data.get("user_metadata", {}).get("name")
        )
        user = CurrentUser(id=user_id, email=email, full_name=full_name)

        # Evict expired entries when cache gets large
        if len(_token_cache) > 500:
            expired = [k for k, v in _token_cache.items() if v[1] <= now]
            for k in expired:
                del _token_cache[k]

        _token_cache[token] = (user, now + _CACHE_TTL)
        return user
    except httpx.RequestError:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Auth service unavailable")


async def get_current_user_id(
    user: CurrentUser = Depends(get_current_user),
) -> str:
    return user.id
