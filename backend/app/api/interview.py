from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.interview import InterviewQuestion, InterviewAttempt
from app.models.skill import Skill
from app.models.project import Project
from app.models.gap_analysis import GapAnalysis
from app.models.career_preferences import CareerPreferences
from app.models.resume import ResumeAnalysis
from app.services.interview_engine import generate_interview_questions, evaluate_interview_answer
from app.schemas.common import ok

router = APIRouter(prefix="/api/interview", tags=["interview"])


@router.get("/questions")
async def get_or_generate_interview_questions(
    category: str = Query(None),
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    # Check cached questions
    query = select(InterviewQuestion).where(InterviewQuestion.user_id == user_id)
    if category:
        query = query.where(InterviewQuestion.category == category)
    existing = (await db.execute(query)).scalars().all()

    if existing:
        return ok(data=[_serialize_question(q) for q in existing])

    # Generate fresh
    prefs_result = await db.execute(select(CareerPreferences).where(CareerPreferences.user_id == user_id))
    prefs = prefs_result.scalar_one_or_none()
    if not prefs:
        raise HTTPException(status_code=400, detail="Set career preferences first")

    skills = (await db.execute(select(Skill).where(Skill.user_id == user_id))).scalars().all()
    projects = (await db.execute(select(Project).where(Project.user_id == user_id))).scalars().all()
    gap_result = (await db.execute(
        select(GapAnalysis).where(GapAnalysis.user_id == user_id)
        .order_by(GapAnalysis.created_at.desc()).limit(1)
    )).scalar_one_or_none()

    analysis_result = (await db.execute(
        select(ResumeAnalysis).where(ResumeAnalysis.user_id == user_id)
        .order_by(ResumeAnalysis.created_at.desc()).limit(1)
    )).scalar_one_or_none()

    strong_skills = [s.name for s in skills if s.evidence_strength == "strong"]
    gaps = gap_result.missing_skills[:5] if gap_result else []
    resume_summary = analysis_result.summary if analysis_result else ""

    try:
        questions_by_category = await generate_interview_questions(
            target_role=prefs.target_role,
            resume_summary=resume_summary,
            projects=[{"name": p.name, "description": p.description, "technologies": p.technologies} for p in projects],
            strong_skills=strong_skills,
            gaps=gaps,
        )
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))

    for cat, qs in questions_by_category.items():
        if not isinstance(qs, list):
            continue
        for q in qs:
            question = InterviewQuestion(
                user_id=user_id,
                target_role=prefs.target_role,
                category=q.get("category", cat),
                question=q.get("question", ""),
                difficulty=q.get("difficulty", "medium"),
                answer_guidance=q.get("answer_guidance", ""),
            )
            db.add(question)

    await db.commit()

    all_qs = (await db.execute(select(InterviewQuestion).where(InterviewQuestion.user_id == user_id))).scalars().all()
    return ok(data=[_serialize_question(q) for q in all_qs])


class AnswerRequest(BaseModel):
    answer: str


@router.post("/questions/{question_id}/answer")
async def answer_interview_question(
    question_id: str,
    body: AnswerRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    question_result = await db.execute(
        select(InterviewQuestion).where(InterviewQuestion.id == question_id, InterviewQuestion.user_id == user_id)
    )
    question = question_result.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    analysis = (await db.execute(
        select(ResumeAnalysis).where(ResumeAnalysis.user_id == user_id)
        .order_by(ResumeAnalysis.created_at.desc()).limit(1)
    )).scalar_one_or_none()

    try:
        feedback = await evaluate_interview_answer(
            question=question.question,
            answer=body.answer,
            target_role=question.target_role,
            resume_context=analysis.summary if analysis else "",
            answer_guidance=question.answer_guidance or "",
        )
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))

    attempt = InterviewAttempt(
        user_id=user_id,
        question_id=question_id,
        answer=body.answer,
        ai_feedback=feedback,
        score=feedback.get("score", 0),
    )
    db.add(attempt)
    await db.commit()

    return ok(data=feedback)


def _serialize_question(q: InterviewQuestion) -> dict:
    return {
        "id": q.id,
        "category": q.category,
        "question": q.question,
        "difficulty": q.difficulty,
        "answer_guidance": q.answer_guidance,
        "target_role": q.target_role,
    }
