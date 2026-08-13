from pydantic import model_validator
from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    # Supabase
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""

    # Database
    database_url: str = ""

    # AI
    ai_provider: str = "openai"
    gemini_api_key: str = ""
    openai_api_key: str = ""
    gpt_api_key: str = ""          # alias — some .env files use GPT_API_KEY
    openai_base_url: str = "https://agentrouter.org/v1"
    openai_model: str = "gpt-5.6-sol"
    openai_high_effort: bool = True

    @property
    def effective_openai_key(self) -> str:
        """Return the first non-empty API key across all naming conventions."""
        return self.openai_api_key or self.gpt_api_key or self.gemini_api_key

    # File storage
    max_resume_size_mb: int = 10
    upload_dir: str = "./uploads"  # fallback used only if Supabase Storage is unreachable
    supabase_storage_bucket: str = "resumes"

    # CORS
    cors_origins: str = "http://localhost:5173"

    # App
    secret_key: str = "change-me"
    environment: str = "development"

    # Admin
    admin_secret_key: str = "SkillForge@Admin2024"

    @model_validator(mode="before")
    @classmethod
    def _strip_whitespace(cls, values):
        """Guard against stray tabs/spaces from copy-pasting env vars into a
        hosting dashboard (Render, Vercel, ...) — a leading/trailing tab is
        invisible in most UIs but breaks httpx URL parsing outright."""
        if isinstance(values, dict):
            return {k: (v.strip() if isinstance(v, str) else v) for k, v in values.items()}
        return values

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    @property
    def max_resume_size_bytes(self) -> int:
        return self.max_resume_size_mb * 1024 * 1024

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
