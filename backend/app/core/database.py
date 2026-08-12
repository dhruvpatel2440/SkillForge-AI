from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from app.core.config import get_settings

settings = get_settings()

engine = create_async_engine(
    settings.database_url,
    echo=False,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    pool_timeout=30,
    pool_recycle=1800,
)

AsyncSessionLocal = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        from sqlalchemy import text
        # Idempotent column migrations
        migrations = [
            "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false",
            "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role VARCHAR NOT NULL DEFAULT 'user'",
            "ALTER TABLE skills ADD COLUMN IF NOT EXISTS classification VARCHAR",
            "ALTER TABLE skills ADD COLUMN IF NOT EXISTS years_estimated FLOAT",
            "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT",
            "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location VARCHAR",
            "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_url VARCHAR",
            "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS github_url VARCHAR",
            "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS website_url VARCHAR",
        ]
        for sql in migrations:
            await conn.execute(text(sql))

    # Seeding runs in its own transaction — a failure here must never roll back
    # the schema created above.
    from sqlalchemy import text
    from app.core.ai_config import AVAILABLE_MODELS
    async with engine.begin() as conn:
        for model_name, meta in AVAILABLE_MODELS.items():
            await conn.execute(
                text("""
                    INSERT INTO ai_model_pricing
                        (id, provider, model, input_cost_per_1m_tokens,
                         output_cost_per_1m_tokens, currency, active)
                    SELECT gen_random_uuid()::text, CAST(:provider AS VARCHAR),
                           CAST(:model AS VARCHAR), CAST(:inp AS FLOAT),
                           CAST(:out AS FLOAT), 'USD', true
                    WHERE NOT EXISTS (
                        SELECT 1 FROM ai_model_pricing
                        WHERE model = CAST(:model_check AS VARCHAR)
                    )
                """),
                {
                    "provider": meta["provider"],
                    "model": model_name,
                    "model_check": model_name,
                    "inp": meta["input_cost_per_1m"],
                    "out": meta["output_cost_per_1m"],
                },
            )
