import json
import logging
from app.ai.service import get_ai_provider
from app.ai.prompts import RESUME_EXTRACTION_PROMPT, SYSTEM_JSON

logger = logging.getLogger(__name__)


async def analyze_resume(markdown: str, user_id: str | None = None) -> dict:
    ai = get_ai_provider()
    prompt = RESUME_EXTRACTION_PROMPT.format(markdown=markdown)

    try:
        result = await ai.generate_json(prompt, system=SYSTEM_JSON, user_id=user_id, feature="resume_analysis")
        _validate_resume_result(result)
        return result
    except Exception as e:
        logger.warning(f"First AI attempt failed: {e}. Retrying with correction prompt.")
        correction = (
            f"The previous response was malformed. "
            f"Return ONLY valid JSON with no extra text. "
            f"Original task:\n{prompt}"
        )
        try:
            result = await ai.generate_json(correction, system=SYSTEM_JSON, user_id=user_id, feature="resume_analysis")
            _validate_resume_result(result)
            return result
        except Exception as e2:
            logger.error(f"Second AI attempt also failed: {e2}")
            raise ValueError(f"AI analysis failed: {e2}") from e2


def _validate_resume_result(result: dict) -> None:
    required = ["candidate", "skills", "projects", "experience", "education"]
    for key in required:
        if key not in result:
            raise ValueError(f"Missing required key in AI response: {key}")
    if not isinstance(result["skills"], list):
        raise ValueError("skills must be a list")
    # Normalise: clamp confidence to [0, 1] and default classification
    for s in result["skills"]:
        s["confidence"] = max(0.0, min(1.0, float(s.get("confidence", 0.3))))
        if s.get("classification") not in ("claimed", "touched", "demonstrated", "proven"):
            s["classification"] = "claimed"
        if s.get("evidence_strength") not in ("strong", "moderate", "weak"):
            s["evidence_strength"] = "weak"
