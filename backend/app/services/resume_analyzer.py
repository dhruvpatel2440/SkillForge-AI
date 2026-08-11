import json
import logging
from app.ai.service import get_ai_provider
from app.ai.prompts import RESUME_EXTRACTION_PROMPT, SYSTEM_JSON

logger = logging.getLogger(__name__)


async def analyze_resume(markdown: str) -> dict:
    ai = get_ai_provider()
    prompt = RESUME_EXTRACTION_PROMPT.format(markdown=markdown)

    try:
        result = await ai.generate_json(prompt, system=SYSTEM_JSON)
        _validate_resume_result(result)
        return result
    except (ValueError, json.JSONDecodeError, KeyError) as e:
        logger.warning(f"First AI attempt failed: {e}. Retrying with correction prompt.")
        correction = (
            f"The previous response was malformed. "
            f"Return ONLY valid JSON with no extra text. "
            f"Original task:\n{prompt}"
        )
        try:
            result = await ai.generate_json(correction, system=SYSTEM_JSON)
            _validate_resume_result(result)
            return result
        except Exception as e2:
            logger.error(f"Second AI attempt also failed: {e2}")
            raise ValueError("AI analysis failed after retry. Please try again.")


def _validate_resume_result(result: dict) -> None:
    required = ["candidate", "skills", "projects", "experience", "education"]
    for key in required:
        if key not in result:
            raise ValueError(f"Missing required key in AI response: {key}")
    if not isinstance(result["skills"], list):
        raise ValueError("skills must be a list")
