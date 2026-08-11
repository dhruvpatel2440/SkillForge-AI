import json
import logging
from app.ai.service import get_ai_provider
from app.ai.prompts import RESOURCE_PROMPT, SYSTEM_JSON

logger = logging.getLogger(__name__)


async def generate_resources(
    week_title: str,
    objective: str,
    skills: list,
    phase: str,
    estimated_hours: int,
) -> list[dict]:
    ai = get_ai_provider()
    prompt = RESOURCE_PROMPT.format(
        week_title=week_title,
        objective=objective,
        skills=json.dumps(skills),
        phase=phase,
        estimated_hours=estimated_hours,
    )

    try:
        result = await ai.generate_json(prompt, system=SYSTEM_JSON)
        if isinstance(result, dict):
            result = result.get("resources", list(result.values())[0] if result else [])
        if not isinstance(result, list):
            raise ValueError("Resources must be a list")
        return result
    except Exception as e:
        logger.warning(f"Resource generation failed: {e}")
        return []
