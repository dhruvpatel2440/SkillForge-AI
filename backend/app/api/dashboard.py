from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.gap_analysis import GapAnalysis
from app.models.roadmap import Roadmap, RoadmapWeek, RoadmapTask
from app.models.career_preferences import CareerPreferences
from app.models.skill import Skill
from app.models.quiz import QuizAttempt
from app.models.interview import InterviewAttempt
from app.schemas.common import ok

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("")
async def get_dashboard(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    prefs = (await db.execute(select(CareerPreferences).where(CareerPreferences.user_id == user_id))).scalar_one_or_none()
    gap = (await db.execute(
        select(GapAnalysis).where(GapAnalysis.user_id == user_id).order_by(GapAnalysis.created_at.desc()).limit(1)
    )).scalar_one_or_none()
    roadmap = (await db.execute(
        select(Roadmap).where(Roadmap.user_id == user_id).order_by(Roadmap.created_at.desc()).limit(1)
    )).scalar_one_or_none()

    skills = (await db.execute(select(Skill).where(Skill.user_id == user_id))).scalars().all()
    skills_mastered = [s for s in skills if s.evidence_strength == "strong"]
    skills_in_progress = [s for s in skills if s.evidence_strength in ("moderate", "weak")]

    weeks = []
    current_week = None
    total_progress = 0.0
    if roadmap:
        all_weeks = (await db.execute(
            select(RoadmapWeek).where(RoadmapWeek.roadmap_id == roadmap.id)
            .order_by(RoadmapWeek.week_number)
        )).scalars().all()
        weeks = all_weeks
        for w in all_weeks:
            if w.status in ("pending", "in_progress"):
                current_week = w
                break
        if all_weeks:
            completed = sum(1 for w in all_weeks if w.status == "completed")
            total_progress = (completed / len(all_weeks)) * 100

    # Latest quiz score
    latest_quiz = (await db.execute(
        select(QuizAttempt).where(QuizAttempt.user_id == user_id)
        .order_by(QuizAttempt.completed_at.desc()).limit(1)
    )).scalar_one_or_none()

    # Interview score average
    interview_attempts = (await db.execute(
        select(InterviewAttempt).where(InterviewAttempt.user_id == user_id)
    )).scalars().all()
    interview_score = (
        sum(a.score for a in interview_attempts if a.score) / len(interview_attempts)
        if interview_attempts else 0
    )

    # Upcoming tasks
    upcoming_tasks = []
    if current_week:
        tasks = (await db.execute(
            select(RoadmapTask).where(
                RoadmapTask.roadmap_week_id == current_week.id,
                RoadmapTask.completed == False,
            ).limit(5)
        )).scalars().all()
        upcoming_tasks = [{"title": t.title, "type": t.task_type, "hours": t.estimated_hours} for t in tasks]

    return ok(data={
        "target_role": prefs.target_role if prefs else None,
        "readiness_score": gap.readiness_score if gap else 0,
        "roadmap_progress": round(total_progress, 1),
        "current_week": {
            "number": current_week.week_number,
            "title": current_week.title,
            "phase": current_week.phase,
            "id": current_week.id,
        } if current_week else None,
        "skills_mastered": len(skills_mastered),
        "skills_in_progress": len(skills_in_progress),
        "critical_gaps": (gap.missing_skills or [])[:3] if gap else [],
        "upcoming_tasks": upcoming_tasks,
        "latest_quiz_score": latest_quiz.score if latest_quiz else None,
        "interview_prep_score": round(interview_score, 1),
        "score_breakdown": gap.score_breakdown if gap else {},
        "total_weeks": len(weeks),
        "completed_weeks": sum(1 for w in weeks if w.status == "completed"),
    })
