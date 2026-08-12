import json
import logging
from app.ai.service import get_ai_provider
from app.ai.prompts import ROADMAP_PROMPT, SYSTEM_JSON

logger = logging.getLogger(__name__)


async def generate_roadmap(
    target_role: str,
    timeline_months: int,
    weekly_hours: int,
    gap_analysis: dict,
    user_id: str | None = None,
) -> list[dict]:
    ai = get_ai_provider()
    duration_weeks = timeline_months * 4

    strong_skills = [s["skill"] for s in gap_analysis.get("strengths", [])]
    gaps = gap_analysis.get("missing_skills", []) + [
        {"skill": s["skill"], "priority": "medium", "reason": s.get("issue", "")}
        for s in gap_analysis.get("weak_skills", [])
    ]

    prompt = ROADMAP_PROMPT.format(
        target_role=target_role,
        timeline_months=timeline_months,
        duration_weeks=duration_weeks,
        weekly_hours=weekly_hours,
        gap_analysis_json=json.dumps(gap_analysis, indent=2),
        strong_skills=json.dumps(strong_skills),
        gaps_to_address=json.dumps(gaps, indent=2),
    )

    try:
        result = await ai.generate_json(prompt, system=SYSTEM_JSON, user_id=user_id, feature="roadmap_generation")
        if isinstance(result, dict) and "weeks" in result:
            result = result["weeks"]
        if not isinstance(result, list):
            raise ValueError("Roadmap must be a list of weeks")
        return result
    except Exception as e:
        logger.error(f"Roadmap generation failed: {e}")
        raise ValueError("Roadmap generation failed. Please try again.")
