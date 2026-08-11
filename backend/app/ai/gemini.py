import json
import re
from google import genai
from google.genai import types
from app.ai.base import BaseAIProvider
from app.core.config import get_settings

settings = get_settings()


class GeminiProvider(BaseAIProvider):
    def __init__(self):
        self._client = genai.Client(api_key=settings.gemini_api_key)
        self._model = "gemini-3.5-flash"

    async def generate(self, prompt: str, system: str = "", temperature: float = 0.2) -> str:
        full_prompt = f"{system}\n\n{prompt}" if system else prompt
        response = await self._client.aio.models.generate_content(
            model=self._model,
            contents=full_prompt,
            config=types.GenerateContentConfig(temperature=temperature),
        )
        return response.text

    async def generate_json(self, prompt: str, system: str = "", temperature: float = 0.1) -> dict:
        full_prompt = f"{system}\n\n{prompt}" if system else prompt
        response = await self._client.aio.models.generate_content(
            model=self._model,
            contents=full_prompt,
            config=types.GenerateContentConfig(
                temperature=temperature,
                response_mime_type="application/json",
            ),
        )
        text = response.text
        # Strip markdown fences if present
        text = re.sub(r"^```(?:json)?\s*", "", text.strip())
        text = re.sub(r"\s*```$", "", text)
        return json.loads(text)
