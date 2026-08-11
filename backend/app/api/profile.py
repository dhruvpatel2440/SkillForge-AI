from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.profile import Profile
from app.models.career_preferences import CareerPreferences
from app.schemas.common import ok

router = APIRouter(prefix="/api", tags=["profile"])


class CareerPrefsRequest(BaseModel):
    target_role: str
    timeline_months: int
    weekly_hours: int


@router.get("/profile")
async def get_profile(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    result = await db.execute(select(Profile).where(Profile.user_id == user_id))
    profile = result.scalar_one_or_none()
    if not profile:
        return ok(data=None)
    return ok(data={
        "id": profile.id,
        "user_id": profile.user_id,
        "full_name": profile.full_name,
        "email": profile.email,
        "onboarding_completed": profile.onboarding_completed,
    })


@router.put("/career-preferences")
async def update_career_preferences(
    body: CareerPrefsRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    result = await db.execute(select(CareerPreferences).where(CareerPreferences.user_id == user_id))
    prefs = result.scalar_one_or_none()
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
    result = await db.execute(select(CareerPreferences).where(CareerPreferences.user_id == user_id))
    prefs = result.scalar_one_or_none()
    if not prefs:
        return ok(data=None)
    return ok(data={
        "id": prefs.id,
        "target_role": prefs.target_role,
        "timeline_months": prefs.timeline_months,
        "weekly_hours": prefs.weekly_hours,
    })
