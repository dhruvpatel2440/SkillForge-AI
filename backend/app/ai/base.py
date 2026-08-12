from abc import ABC, abstractmethod


class BaseAIProvider(ABC):
    @abstractmethod
    async def generate(
        self,
        prompt: str,
        system: str = "",
        temperature: float = 0.2,
        user_id: str | None = None,
        feature: str = "other",
    ) -> str:
        """Generate a text response from the model."""

    @abstractmethod
    async def generate_json(
        self,
        prompt: str,
        system: str = "",
        temperature: float = 0.1,
        user_id: str | None = None,
        feature: str = "other",
    ) -> dict:
        """Generate a structured JSON response; raises ValueError if parsing fails."""
