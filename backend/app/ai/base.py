from abc import ABC, abstractmethod
from typing import Any


class BaseAIProvider(ABC):
    @abstractmethod
    async def generate(self, prompt: str, system: str = "", temperature: float = 0.2) -> str:
        """Generate a text response from the model."""

    @abstractmethod
    async def generate_json(self, prompt: str, system: str = "", temperature: float = 0.1) -> dict:
        """Generate a structured JSON response; raises ValueError if parsing fails."""
