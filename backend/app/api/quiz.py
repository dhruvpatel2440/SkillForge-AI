import logging
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.quiz import Quiz, QuizAttempt
from app.models.roadmap import RoadmapWeek, Roadmap
from app.services.quiz_engine import generate_quiz, score_quiz
from app.schemas.common import ok

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["quiz"])


def _err(status: int, detail: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"detail": detail})


@router.post("/weeks/{week_id}/quiz")
async def get_or_create_quiz(
    week_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    try:
        week_result = await db.execute(select(RoadmapWeek).where(RoadmapWeek.id == week_id))
        week = week_result.scalar_one_or_none()
        if not week:
            return _err(404, "Week not found")

        rm = (await db.execute(
            select(Roadmap).where(Roadmap.id == week.roadmap_id, Roadmap.user_id == user_id)
        )).scalar_one_or_none()
        if not rm:
            return _err(403, "Access denied")

        existing = (await db.execute(
            select(Quiz).where(Quiz.roadmap_week_id == week_id, Quiz.user_id == user_id)
        )).scalar_one_or_none()

        if existing:
            questions = [{**q, "explanation": q.get("explanation", "")} for q in existing.questions]
            return ok(data={"quiz_id": existing.id, "title": existing.title, "questions": questions})

        questions_data = await generate_quiz(
            week_title=week.title,
            objective=week.objective or "",
            skills=week.skills or [],
            user_id=user_id,
        )

        quiz = Quiz(
            user_id=user_id,
            roadmap_week_id=week_id,
            title=f"Week {week.week_number}: {week.title} — Quiz",
            questions=questions_data,
            passing_score=60,
        )
        db.add(quiz)
        await db.commit()
        await db.refresh(quiz)

        return ok(data={"quiz_id": quiz.id, "title": quiz.title, "questions": quiz.questions})

    except Exception as e:
        logger.error(f"Quiz generation error: {e}", exc_info=True)
        await db.rollback()
        msg = str(e) if str(e) else "Quiz generation failed. Try again."
        return _err(503, msg)


class QuizSubmission(BaseModel):
    answers: list[int]


@router.post("/quizzes/{quiz_id}/submit")
async def submit_quiz(
    quiz_id: str,
    body: QuizSubmission,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    try:
        quiz_result = await db.execute(select(Quiz).where(Quiz.id == quiz_id, Quiz.user_id == user_id))
        quiz = quiz_result.scalar_one_or_none()
        if not quiz:
            return _err(404, "Quiz not found")

        result = score_quiz(quiz.questions, body.answers)

        attempt = QuizAttempt(
            quiz_id=quiz_id,
            user_id=user_id,
            answers=body.answers,
            score=result["score"],
            passed=result["passed"],
            feedback=result,
        )
        db.add(attempt)
        await db.commit()

        return ok(data=result, message=result["verdict"])

    except Exception as e:
        logger.error(f"Quiz submit error: {e}", exc_info=True)
        await db.rollback()
        return _err(500, str(e) if str(e) else "Failed to submit quiz")
