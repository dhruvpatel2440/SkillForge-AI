from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import httpx

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.profile import Profile
from app.schemas.common import ok

router = APIRouter(prefix="/api/auth", tags=["auth"])
settings = get_settings()


class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/register")
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{settings.supabase_url}/auth/v1/signup",
            headers={
                "apikey": settings.supabase_anon_key,
                "Content-Type": "application/json",
            },
            json={"email": body.email, "password": body.password},
            timeout=15,
        )
    if resp.status_code not in (200, 201):
        detail = resp.json().get("msg") or resp.json().get("error_description") or "Registration failed"
        raise HTTPException(status_code=400, detail=detail)

    user_data = resp.json()
    user_id = user_data.get("user", {}).get("id") or user_data.get("id")
    if user_id:
        existing = await db.execute(select(Profile).where(Profile.user_id == user_id))
        if not existing.scalar_one_or_none():
            profile = Profile(user_id=user_id, full_name=body.full_name, email=body.email)
            db.add(profile)

    return ok(data=user_data, message="Registration successful")


@router.post("/login")
async def login(body: LoginRequest):
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{settings.supabase_url}/auth/v1/token?grant_type=password",
            headers={
                "apikey": settings.supabase_anon_key,
                "Content-Type": "application/json",
            },
            json={"email": body.email, "password": body.password},
            timeout=15,
        )
    if resp.status_code != 200:
        detail = resp.json().get("error_description") or "Login failed"
        raise HTTPException(status_code=401, detail=detail)

    return ok(data=resp.json(), message="Login successful")


@router.post("/profile")
async def create_or_update_profile(
    body: dict,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    result = await db.execute(select(Profile).where(Profile.user_id == user_id))
    profile = result.scalar_one_or_none()
    if profile:
        if "full_name" in body:
            profile.full_name = body["full_name"]
        if "email" in body:
            profile.email = body["email"]
    else:
        profile = Profile(user_id=user_id, **{k: v for k, v in body.items() if k in ("full_name", "email")})
        db.add(profile)
    return ok(message="Profile updated")
