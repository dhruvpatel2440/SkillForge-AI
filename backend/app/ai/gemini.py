import json
import re
import uuid
import time
import asyncio
import logging
from google import genai
from google.genai import types
from app.ai.base import BaseAIProvider
from app.core.config import get_settings
from app.core.ai_config import get_active_model, get_fallback_chain

logger = logging.getLogger(__name__)
settings = get_settings()

_pricing_cache: dict[str, tuple[float, float, float]] = {}
_PRICING_TTL = 600


def _is_retryable_model_error(exc: Exception) -> bool:
    """True when the failure is about *this model* (quota/availability), not the request.

    These are worth retrying on the other model; a malformed prompt is not.
    """
    text = str(exc).lower()
    markers = (
        "429", "resource_exhausted", "quota", "rate limit", "rate_limit",
        "503", "unavailable", "overloaded", "404", "not_found", "not found",
    )
    return any(m in text for m in markers)


async def _get_pricing(model: str) -> tuple[float, float] | None:
    now = time.monotonic()
    cached = _pricing_cache.get(model)
    if cached and (now - cached[2]) < _PRICING_TTL:
        return cached[0], cached[1]
    try:
        from app.core.database import AsyncSessionLocal
        from app.models.ai_usage import AIModelPricing
        from sqlalchemy import select
        async with AsyncSessionLocal() as db:
            pricing = (await db.execute(
                select(AIModelPricing)
                .where(AIModelPricing.model == model, AIModelPricing.active == True)
                .limit(1)
            )).scalar_one_or_none()
            if pricing:
                _pricing_cache[model] = (
                    pricing.input_cost_per_1m_tokens,
                    pricing.output_cost_per_1m_tokens,
                    now,
                )
                return pricing.input_cost_per_1m_tokens, pricing.output_cost_per_1m_tokens
    except Exception as e:
        logger.warning(f"Pricing lookup failed: {e}")
    return None


async def _log_usage(
    user_id: str | None,
    feature: str,
    model: str,
    request_id: str,
    input_tokens: int | None,
    output_tokens: int | None,
    total_tokens: int | None,
    latency_ms: int,
    status: str,
    error_message: str | None = None,
):
    try:
        from app.core.database import AsyncSessionLocal
        from app.models.ai_usage import AIUsageLog

        estimated_cost = None
        if input_tokens is not None and output_tokens is not None:
            pricing = await _get_pricing(model)
            if pricing:
                estimated_cost = (
                    (input_tokens / 1_000_000) * pricing[0] +
                    (output_tokens / 1_000_000) * pricing[1]
                )

        async with AsyncSessionLocal() as db:
            log = AIUsageLog(
                user_id=user_id,
                request_id=request_id,
                feature=feature,
                model=model,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                total_tokens=total_tokens,
                estimated_cost=estimated_cost,
                latency_ms=latency_ms,
                status=status,
                error_message=error_message,
            )
            db.add(log)
            await db.commit()
    except Exception as e:
        logger.warning(f"AI usage logging failed (non-critical): {e}")


class GeminiProvider(BaseAIProvider):
    def __init__(self):
        self._client = genai.Client(api_key=settings.gemini_api_key)

    @property
    def model(self) -> str:
        """Read live on every call so an admin's switch takes effect immediately."""
        return get_active_model()

    async def _call(
        self,
        full_prompt: str,
        config: types.GenerateContentConfig,
        user_id: str | None,
        feature: str,
    ):
        """Run one generation, walking the fallback chain on quota/availability errors.

        Returns (response, model_actually_used). Raises the *first* error if every
        model fails, since that one describes the admin's actual selection.
        """
        primary = self.model
        candidates = [primary] + get_fallback_chain(primary)
        first_error: Exception | None = None

        for attempt, model in enumerate(candidates):
            request_id = str(uuid.uuid4())
            start = time.monotonic()
            try:
                response = await self._client.aio.models.generate_content(
                    model=model, contents=full_prompt, config=config
                )
                self._log_success(response, user_id, feature, model, request_id, start)
                if attempt > 0:
                    logger.info(f"[AI] {feature} recovered on fallback model {model}")
                return response, model

            except Exception as exc:
                latency_ms = int((time.monotonic() - start) * 1000)
                asyncio.ensure_future(_log_usage(
                    user_id, feature, model, request_id,
                    None, None, None, latency_ms, "failed", str(exc)[:500],
                ))
                logger.error(f"[AI] {feature} on {model} failed latency={latency_ms}ms error={exc}")

                if first_error is None:
                    first_error = exc

                # A bad prompt fails identically everywhere — don't burn the chain on it.
                if not _is_retryable_model_error(exc):
                    raise

                remaining = candidates[attempt + 1:]
                if remaining:
                    logger.warning(f"[AI] {model} unavailable — trying {remaining[0]}")

        logger.error(f"[AI] {feature}: every model in the chain failed ({', '.join(candidates)})")
        raise first_error

    def _log_success(self, response, user_id, feature, model, request_id, start):
        latency_ms = int((time.monotonic() - start) * 1000)
        um = getattr(response, "usage_metadata", None)
        input_t = getattr(um, "prompt_token_count", None)
        output_t = getattr(um, "candidates_token_count", None)
        total_t = getattr(um, "total_token_count", None)
        asyncio.ensure_future(_log_usage(
            user_id, feature, model, request_id,
            input_t, output_t, total_t, latency_ms, "success",
        ))
        logger.info(f"[AI] {feature} {model} tokens={total_t} latency={latency_ms}ms")

    async def generate(
        self,
        prompt: str,
        system: str = "",
        temperature: float = 0.2,
        user_id: str | None = None,
        feature: str = "other",
    ) -> str:
        full_prompt = f"{system}\n\n{prompt}" if system else prompt
        response, _ = await self._call(
            full_prompt,
            types.GenerateContentConfig(temperature=temperature),
            user_id,
            feature,
        )
        return response.text

    async def generate_json(
        self,
        prompt: str,
        system: str = "",
        temperature: float = 0.1,
        user_id: str | None = None,
        feature: str = "other",
    ) -> dict:
        full_prompt = f"{system}\n\n{prompt}" if system else prompt
        response, _ = await self._call(
            full_prompt,
            types.GenerateContentConfig(
                temperature=temperature,
                response_mime_type="application/json",
            ),
            user_id,
            feature,
        )
        text = response.text
        text = re.sub(r"^```(?:json)?\s*", "", text.strip())
        text = re.sub(r"\s*```$", "", text)
        return json.loads(text)
