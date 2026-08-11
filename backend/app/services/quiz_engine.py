import json
import logging
from app.ai.service import get_ai_provider
from app.ai.prompts import QUIZ_PROMPT, SYSTEM_JSON

logger = logging.getLogger(__name__)


async def generate_quiz(
    week_title: str,
    objective: str,
    skills: list,
    content_summary: str = "",
) -> list[dict]:
    ai = get_ai_provider()
    prompt = QUIZ_PROMPT.format(
        week_title=week_title,
        objective=objective,
        skills=json.dumps(skills),
        content_summary=content_summary or objective,
    )

    try:
        result = await ai.generate_json(prompt, system=SYSTEM_JSON)
        if isinstance(result, dict):
            result = result.get("questions", list(result.values())[0] if result else [])
        if not isinstance(result, list) or len(result) == 0:
            raise ValueError("Quiz must be a non-empty list")
        return result
    except Exception as e:
        logger.error(f"Quiz generation failed: {e}")
        raise ValueError("Quiz generation failed. Try again.")


def score_quiz(questions: list, answers: list[int]) -> dict:
    if len(answers) != len(questions):
        raise ValueError("Answers count does not match questions count")

    correct = 0
    feedback = []
    for i, (q, ans) in enumerate(zip(questions, answers)):
        is_correct = ans == q.get("correct", -1)
        if is_correct:
            correct += 1
        feedback.append({
            "question": q["text"],
            "your_answer": q["options"][ans] if 0 <= ans < len(q["options"]) else "No answer",
            "correct_answer": q["options"][q["correct"]],
            "is_correct": is_correct,
            "explanation": q.get("explanation", ""),
        })

    score = round((correct / len(questions)) * 100)
    if score >= 80:
        verdict = "Excellent — skill marked acquired"
    elif score >= 60:
        verdict = "Passed — continue to next week"
    elif score >= 40:
        verdict = "Review recommended before proceeding"
    else:
        verdict = "Retry required — revisit the material"

    return {
        "score": score,
        "correct": correct,
        "total": len(questions),
        "passed": score >= 60,
        "verdict": verdict,
        "feedback": feedback,
    }
