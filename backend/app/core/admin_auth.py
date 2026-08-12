from fastapi import Depends, HTTPException, Security, status
from fastapi.security import APIKeyHeader
from app.core.config import get_settings

settings = get_settings()

_header = APIKeyHeader(name="X-Admin-Key", auto_error=False)


async def require_admin(key: str | None = Security(_header)) -> str:
    if not key or key != settings.admin_secret_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing admin key",
        )
    return key
