import json
import time
import logging
from app.ai.service import get_ai_provider
from app.ai.prompts import PROJECT_RECOMMENDATIONS_PROMPT, SYSTEM_JSON

logger = logging.getLogger(__name__)

# In-memory cache: {user_id: (recommendations, expires_at)}
_cache: dict[str, tuple[list, float]] = {}
_TTL = 3600 * 6  # 6 hours


async def generate_project_recommendations(
    target_role: str,
    timeline_months: int,
    weekly_hours: int,
    missing_skills: list,
    weak_skills: list,
    strong_skills: list,
    existing_projects: list,
    user_id: str | None = None,
    force: bool = False,
) -> list:
    if not force and user_id and user_id in _cache:
        data, expires = _cache[user_id]
        if time.monotonic() < expires:
            return data

    ai = get_ai_provider()
    prompt = PROJECT_RECOMMENDATIONS_PROMPT.format(
        target_role=target_role,
        timeline_months=timeline_months,
        weekly_hours=weekly_hours,
        missing_skills_json=json.dumps(missing_skills, indent=2),
        weak_skills_json=json.dumps(weak_skills, indent=2),
        strong_skills_json=json.dumps(strong_skills, indent=2),
        existing_projects_json=json.dumps(existing_projects, indent=2),
    )

    try:
        result = await ai.generate_json(prompt, system=SYSTEM_JSON, user_id=user_id, feature="project_recommendations")
    except Exception as e:
        logger.warning(f"Project recs first attempt failed: {e}. Retrying.")
        try:
            correction = f"Return ONLY valid JSON array. No text outside JSON.\nOriginal task:\n{prompt}"
            result = await ai.generate_json(correction, system=SYSTEM_JSON, user_id=user_id, feature="project_recommendations")
        except Exception as e2:
            logger.error(f"Project recs retry also failed: {e2}")
            raise ValueError(f"AI failed to generate project recommendations: {e2}") from e2

    if not isinstance(result, list):
        result = result.get("projects", result.get("recommendations", []))

    # Clamp and normalise
    for p in result:
        p.setdefault("gap_count_closed", len(p.get("closes_gaps", [])))
        p.setdefault("estimated_hours", p.get("duration_weeks_max", 2) * weekly_hours)
        p.setdefault("difficulty", "intermediate")

    if user_id:
        _cache[user_id] = (result, time.monotonic() + _TTL)

    return result


def invalidate_cache(user_id: str) -> None:
    _cache.pop(user_id, None)
