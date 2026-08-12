import logging
from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.gap_analysis import GapAnalysis
from app.models.career_preferences import CareerPreferences
from app.models.skill import Skill
from app.models.project import Project
from app.services.project_engine import generate_project_recommendations, invalidate_cache
from app.schemas.common import ok

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/projects-recommended", tags=["project-recommendations"])


def _err(status: int, detail: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"detail": detail})


@router.get("")
async def get_project_recommendations(
    refresh: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    try:
        prefs = (await db.execute(
            select(CareerPreferences).where(CareerPreferences.user_id == user_id)
        )).scalar_one_or_none()
        if not prefs:
            return _err(400, "Set career preferences first")

        gap = (await db.execute(
            select(GapAnalysis).where(GapAnalysis.user_id == user_id)
            .order_by(GapAnalysis.created_at.desc()).limit(1)
        )).scalar_one_or_none()
        if not gap:
            return _err(400, "Run gap analysis first")

        raw = gap.raw_ai_response or {}
        missing_skills = raw.get("missing_skills", gap.missing_skills or [])
        weak_skills = raw.get("weak_skills", gap.weak_evidence_skills or [])
        strengths = raw.get("strengths", gap.strengths or [])

        existing = (await db.execute(
            select(Project).where(Project.user_id == user_id)
        )).scalars().all()
        existing_projects = [{"name": p.name, "technologies": p.technologies} for p in existing]

        if refresh:
            invalidate_cache(user_id)

        recs = await generate_project_recommendations(
            target_role=prefs.target_role,
            timeline_months=prefs.timeline_months,
            weekly_hours=prefs.weekly_hours,
            missing_skills=missing_skills,
            weak_skills=weak_skills,
            strong_skills=strengths,
            existing_projects=existing_projects,
            user_id=user_id,
            force=refresh,
        )

        total_gaps = len(missing_skills) + len(weak_skills)

        return ok(data={
            "target_role": prefs.target_role,
            "total_open_gaps": total_gaps,
            "projects": recs,
        })

    except Exception as e:
        logger.error(f"Project recommendations error: {e}", exc_info=True)
        msg = str(e) if str(e) else "Failed to generate project recommendations"
        return _err(503, msg)
