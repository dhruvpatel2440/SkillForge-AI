import json
import logging
from app.ai.service import get_ai_provider
from app.ai.prompts import INTERVIEW_PROMPT, INTERVIEW_FEEDBACK_PROMPT, SYSTEM_JSON

logger = logging.getLogger(__name__)


async def generate_interview_questions(
    target_role: str,
    resume_summary: str,
    projects: list,
    strong_skills: list,
    gaps: list,
) -> dict:
    ai = get_ai_provider()
    prompt = INTERVIEW_PROMPT.format(
        target_role=target_role,
        resume_summary=resume_summary,
        projects_json=json.dumps(projects, indent=2),
        strong_skills=json.dumps(strong_skills),
        gaps=json.dumps(gaps),
    )

    try:
        result = await ai.generate_json(prompt, system=SYSTEM_JSON)
        return result
    except Exception as e:
        logger.error(f"Interview generation failed: {e}")
        raise ValueError("Interview question generation failed. Try again.")


async def evaluate_interview_answer(
    question: str,
    answer: str,
    target_role: str,
    resume_context: str,
    answer_guidance: str,
) -> dict:
    ai = get_ai_provider()
    prompt = INTERVIEW_FEEDBACK_PROMPT.format(
        question=question,
        target_role=target_role,
        answer=answer,
        resume_context=resume_context,
        answer_guidance=answer_guidance,
    )

    try:
        result = await ai.generate_json(prompt, system=SYSTEM_JSON)
        return result
    except Exception as e:
        logger.error(f"Interview feedback failed: {e}")
        raise ValueError("AI feedback temporarily unavailable. Try again.")
