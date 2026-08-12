import json
import re
import uuid
import time
import asyncio
import logging
from openai import AsyncOpenAI
from app.ai.base import BaseAIProvider
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def _get_client() -> AsyncOpenAI:
    api_key = settings.effective_openai_key
    return AsyncOpenAI(
        api_key=api_key,
        base_url=settings.openai_base_url,
    )


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
        from app.models.ai_usage import AIUsageLog, AIModelPricing
        from sqlalchemy import select

        estimated_cost = None
        async with AsyncSessionLocal() as db:
            pricing = (await db.execute(
                select(AIModelPricing)
                .where(AIModelPricing.model == model, AIModelPricing.active == True)
                .limit(1)
            )).scalar_one_or_none()
            if pricing and input_tokens is not None and output_tokens is not None:
                estimated_cost = (
                    (input_tokens / 1_000_000) * pricing.input_cost_per_1m_tokens +
                    (output_tokens / 1_000_000) * pricing.output_cost_per_1m_tokens
                )
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


class OpenAIProvider(BaseAIProvider):
    def __init__(self):
        self._client = _get_client()
        self._model = settings.openai_model
        self._high_effort = settings.openai_high_effort

    def _extra(self) -> dict:
        if self._high_effort:
            return {"reasoning_effort": "high"}
        return {}

    async def generate(
        self,
        prompt: str,
        system: str = "",
        temperature: float = 0.2,
        user_id: str | None = None,
        feature: str = "other",
    ) -> str:
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        request_id = str(uuid.uuid4())
        start = time.monotonic()
        try:
            resp = await self._client.chat.completions.create(
                model=self._model,
                messages=messages,
                temperature=temperature,
                extra_body=self._extra(),
            )
            latency_ms = int((time.monotonic() - start) * 1000)
            text = resp.choices[0].message.content or ""
            usage = resp.usage
            input_t = getattr(usage, "prompt_tokens", None)
            output_t = getattr(usage, "completion_tokens", None)
            total_t = getattr(usage, "total_tokens", None)
            asyncio.ensure_future(_log_usage(user_id, feature, self._model, request_id, input_t, output_t, total_t, latency_ms, "success"))
            logger.info(f"[AI] {feature} {self._model} tokens={total_t} latency={latency_ms}ms")
            return text
        except Exception as exc:
            latency_ms = int((time.monotonic() - start) * 1000)
            asyncio.ensure_future(_log_usage(user_id, feature, self._model, request_id, None, None, None, latency_ms, "failed", str(exc)[:500]))
            logger.error(f"[AI] {feature} failed latency={latency_ms}ms error={exc}")
            raise

    async def generate_json(
        self,
        prompt: str,
        system: str = "",
        temperature: float = 0.1,
        user_id: str | None = None,
        feature: str = "other",
    ) -> dict:
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        request_id = str(uuid.uuid4())
        start = time.monotonic()

        async def _call(use_json_mode: bool):
            kwargs = dict(
                model=self._model,
                messages=messages,
                temperature=temperature,
                extra_body=self._extra(),
            )
            if use_json_mode:
                kwargs["response_format"] = {"type": "json_object"}
            return await self._client.chat.completions.create(**kwargs)

        try:
            try:
                resp = await _call(use_json_mode=True)
            except Exception as json_mode_err:
                err_str = str(json_mode_err).lower()
                if "response_format" in err_str or "json_object" in err_str or "not supported" in err_str or "invalid" in err_str:
                    logger.warning(f"[AI] json_mode not supported by gateway, retrying without: {json_mode_err}")
                    resp = await _call(use_json_mode=False)
                else:
                    raise

            latency_ms = int((time.monotonic() - start) * 1000)
            text = resp.choices[0].message.content or "{}"
            usage = resp.usage
            input_t = getattr(usage, "prompt_tokens", None)
            output_t = getattr(usage, "completion_tokens", None)
            total_t = getattr(usage, "total_tokens", None)
            asyncio.ensure_future(_log_usage(user_id, feature, self._model, request_id, input_t, output_t, total_t, latency_ms, "success"))
            logger.info(f"[AI] {feature} {self._model} tokens={total_t} latency={latency_ms}ms")
            text = re.sub(r"^```(?:json)?\s*", "", text.strip())
            text = re.sub(r"\s*```$", "", text)
            return json.loads(text)
        except Exception as exc:
            latency_ms = int((time.monotonic() - start) * 1000)
            asyncio.ensure_future(_log_usage(user_id, feature, self._model, request_id, None, None, None, latency_ms, "failed", str(exc)[:500]))
            logger.error(f"[AI] {feature} failed latency={latency_ms}ms error={exc}")
            raise
