from functools import lru_cache
from app.ai.base import BaseAIProvider
from app.core.config import get_settings

settings = get_settings()


@lru_cache
def get_ai_provider() -> BaseAIProvider:
    provider = settings.ai_provider.lower()
    if provider == "gemini":
        from app.ai.gemini import GeminiProvider
        return GeminiProvider()
    elif provider == "openai":
        from app.ai.openai_provider import OpenAIProvider
        return OpenAIProvider()
    else:
        raise ValueError(f"Unknown AI provider: {provider}. Set AI_PROVIDER=gemini or openai")
