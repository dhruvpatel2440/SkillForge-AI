import json
from openai import AsyncOpenAI
from app.ai.base import BaseAIProvider
from app.core.config import get_settings

settings = get_settings()


class OpenAIProvider(BaseAIProvider):
    def __init__(self):
        self._client = AsyncOpenAI(api_key=settings.openai_api_key)

    async def generate(self, prompt: str, system: str = "", temperature: float = 0.2) -> str:
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        resp = await self._client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=temperature,
        )
        return resp.choices[0].message.content

    async def generate_json(self, prompt: str, system: str = "", temperature: float = 0.1) -> dict:
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        resp = await self._client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=temperature,
            response_format={"type": "json_object"},
        )
        return json.loads(resp.choices[0].message.content)
