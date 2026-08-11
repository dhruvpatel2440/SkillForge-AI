from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.gap_analysis import GapAnalysis
from app.models.career_preferences import CareerPreferences
from app.models.resume import Resume
from app.models.skill import Skill
from app.models.project import Project
from app.models.experience import Experience
from app.services.gap_engine import generate_gap_analysis
from app.schemas.common import ok

router = APIRouter(prefix="/api/gap-analysis", tags=["gap-analysis"])


@router.post("/generate")
async def generate_gaps(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    # Get career preferences
    prefs_result = await db.execute(select(CareerPreferences).where(CareerPreferences.user_id == user_id))
    prefs = prefs_result.scalar_one_or_none()
    if not prefs:
        raise HTTPException(status_code=400, detail="Set career preferences first")

    # Get latest resume
    resume_result = await db.execute(
        select(Resume).where(Resume.user_id == user_id, Resume.processing_status == "completed")
        .order_by(Resume.created_at.desc()).limit(1)
    )
    resume = resume_result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=400, detail="Upload and process a resume first")

    # Check cache
    existing_result = await db.execute(
        select(GapAnalysis).where(
            GapAnalysis.user_id == user_id,
            GapAnalysis.target_role == prefs.target_role,
        ).order_by(GapAnalysis.created_at.desc()).limit(1)
    )
    cached = existing_result.scalar_one_or_none()
    if cached:
        return ok(data=_serialize_gap(cached), message="Returning cached gap analysis")

    # Gather data
    skills = (await db.execute(select(Skill).where(Skill.user_id == user_id))).scalars().all()
    projects = (await db.execute(select(Project).where(Project.user_id == user_id))).scalars().all()
    experience = (await db.execute(select(Experience).where(Experience.user_id == user_id))).scalars().all()

    try:
        result = await generate_gap_analysis(
            markdown=resume.markdown_content or "",
            skills=[{"name": s.name, "proficiency": s.proficiency, "evidence_strength": s.evidence_strength, "evidence": s.evidence} for s in skills],
            projects=[{"name": p.name, "description": p.description, "technologies": p.technologies} for p in projects],
            experience=[{"company": e.company, "role": e.role, "description": e.description} for e in experience],
            target_role=prefs.target_role,
            timeline_months=prefs.timeline_months,
            weekly_hours=prefs.weekly_hours,
        )
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))

    gap = GapAnalysis(
        user_id=user_id,
        resume_id=resume.id,
        target_role=prefs.target_role,
        readiness_score=result.get("readiness_score", 0),
        strengths=result.get("strengths", []),
        gaps=result.get("missing_skills", []),
        missing_skills=result.get("missing_skills", []),
        weak_evidence_skills=result.get("weak_skills", []),
        recommendations=result.get("recommendations", []),
        score_breakdown=result.get("score_breakdown", {}),
        raw_ai_response=result,
    )
    db.add(gap)
    await db.commit()
    await db.refresh(gap)
    return ok(data=_serialize_gap(gap), message="Gap analysis generated")


@router.get("")
async def get_gap_analysis(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    result = await db.execute(
        select(GapAnalysis).where(GapAnalysis.user_id == user_id)
        .order_by(GapAnalysis.created_at.desc()).limit(1)
    )
    gap = result.scalar_one_or_none()
    if not gap:
        return ok(data=None)
    return ok(data=_serialize_gap(gap))


def _serialize_gap(gap: GapAnalysis) -> dict:
    return {
        "id": gap.id,
        "target_role": gap.target_role,
        "readiness_score": gap.readiness_score,
        "strengths": gap.strengths,
        "gaps": gap.gaps,
        "missing_skills": gap.missing_skills,
        "weak_evidence_skills": gap.weak_evidence_skills,
        "recommendations": gap.recommendations,
        "score_breakdown": gap.score_breakdown,
        "created_at": gap.created_at.isoformat() if gap.created_at else None,
    }
