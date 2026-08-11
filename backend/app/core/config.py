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
    ai_provider: str = "gemini"
    gemini_api_key: str = ""
    openai_api_key: str = ""

    # File storage
    max_resume_size_mb: int = 10
    upload_dir: str = "./uploads"

    # CORS
    cors_origins: str = "http://localhost:5173"

    # App
    secret_key: str = "change-me"
    environment: str = "development"

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
