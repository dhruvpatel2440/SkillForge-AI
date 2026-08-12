from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user, get_current_user_id, CurrentUser
from app.models.profile import Profile
from app.models.career_preferences import CareerPreferences
from app.schemas.common import ok

router = APIRouter(prefix="/api", tags=["profile"])


class CareerPrefsRequest(BaseModel):
    target_role: str
    timeline_months: int
    weekly_hours: int


class UpdateProfileRequest(BaseModel):
    full_name: str | None = None
    bio: str | None = None
    location: str | None = None
    linkedin_url: str | None = None
    github_url: str | None = None
    website_url: str | None = None


@router.get("/profile")
async def get_profile(
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    profile = (await db.execute(
        select(Profile).where(Profile.user_id == user.id)
    )).scalar_one_or_none()

    if not profile:
        # Auto-create profile on first login — no manual DB migration needed
        profile = Profile(
            user_id=user.id,
            full_name=user.full_name,
            email=user.email,
            onboarding_completed=False,
        )
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
    else:
        # Backfill name/email from Supabase if they were missing
        changed = False
        if user.email and not profile.email:
            profile.email = user.email
            changed = True
        if user.full_name and not profile.full_name:
            profile.full_name = user.full_name
            changed = True
        if changed:
            await db.commit()

    return ok(data={
        "id": profile.id,
        "user_id": profile.user_id,
        "full_name": profile.full_name,
        "email": profile.email,
        "role": profile.role,
        "bio": getattr(profile, "bio", None),
        "location": getattr(profile, "location", None),
        "linkedin_url": getattr(profile, "linkedin_url", None),
        "github_url": getattr(profile, "github_url", None),
        "website_url": getattr(profile, "website_url", None),
        "onboarding_completed": profile.onboarding_completed,
        "created_at": profile.created_at.isoformat() if profile.created_at else None,
    })


@router.patch("/profile")
async def update_profile(
    body: UpdateProfileRequest,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    profile = (await db.execute(
        select(Profile).where(Profile.user_id == user.id)
    )).scalar_one_or_none()

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    if body.full_name is not None:
        profile.full_name = body.full_name.strip() or profile.full_name
    for field in ("bio", "location", "linkedin_url", "github_url", "website_url"):
        val = getattr(body, field, None)
        if val is not None and hasattr(profile, field):
            setattr(profile, field, val.strip() if val else None)

    await db.commit()
    await db.refresh(profile)
    return ok(data={
        "full_name": profile.full_name,
        "bio": getattr(profile, "bio", None),
        "location": getattr(profile, "location", None),
        "linkedin_url": getattr(profile, "linkedin_url", None),
        "github_url": getattr(profile, "github_url", None),
        "website_url": getattr(profile, "website_url", None),
    }, message="Profile updated")


@router.put("/career-preferences")
async def update_career_preferences(
    body: CareerPrefsRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    prefs = (await db.execute(
        select(CareerPreferences).where(CareerPreferences.user_id == user_id)
    )).scalar_one_or_none()

    if prefs:
        prefs.target_role = body.target_role
        prefs.timeline_months = body.timeline_months
        prefs.weekly_hours = body.weekly_hours
    else:
        prefs = CareerPreferences(
            user_id=user_id,
            target_role=body.target_role,
            timeline_months=body.timeline_months,
            weekly_hours=body.weekly_hours,
        )
        db.add(prefs)

    await db.commit()
    return ok(data={
        "target_role": body.target_role,
        "timeline_months": body.timeline_months,
        "weekly_hours": body.weekly_hours,
    }, message="Career preferences saved")


@router.get("/career-preferences")
async def get_career_preferences(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    prefs = (await db.execute(
        select(CareerPreferences).where(CareerPreferences.user_id == user_id)
    )).scalar_one_or_none()

    if not prefs:
        return ok(data=None)
    return ok(data={
        "id": prefs.id,
        "target_role": prefs.target_role,
        "timeline_months": prefs.timeline_months,
        "weekly_hours": prefs.weekly_hours,
    })
