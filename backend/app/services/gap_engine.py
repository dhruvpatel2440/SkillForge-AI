import json
import logging
from app.ai.service import get_ai_provider
from app.ai.prompts import GAP_ANALYSIS_PROMPT, SYSTEM_JSON

logger = logging.getLogger(__name__)


async def generate_gap_analysis(
    markdown: str,
    skills: list,
    projects: list,
    experience: list,
    target_role: str,
    timeline_months: int,
    weekly_hours: int,
) -> dict:
    ai = get_ai_provider()
    prompt = GAP_ANALYSIS_PROMPT.format(
        markdown=markdown,
        skills_json=json.dumps(skills, indent=2),
        projects_json=json.dumps(projects, indent=2),
        experience_json=json.dumps(experience, indent=2),
        target_role=target_role,
        timeline_months=timeline_months,
        weekly_hours=weekly_hours,
    )

    try:
        result = await ai.generate_json(prompt, system=SYSTEM_JSON)
        _validate_gap_result(result)
        return result
    except Exception as e:
        logger.warning(f"Gap analysis first attempt failed: {e}. Retrying.")
        correction = (
            f"Return ONLY valid JSON. No text outside JSON. "
            f"Original task:\n{prompt}"
        )
        result = await ai.generate_json(correction, system=SYSTEM_JSON)
        _validate_gap_result(result)
        return result


def _validate_gap_result(result: dict) -> None:
    required = ["readiness_score", "strengths", "missing_skills", "recommendations"]
    for key in required:
        if key not in result:
            raise ValueError(f"Missing key in gap analysis: {key}")
    score = result["readiness_score"]
    if not (0 <= score <= 100):
        raise ValueError(f"Invalid readiness_score: {score}")
