"""Runtime AI model selection.

The active model lives in the `system_config` DB table so it survives restarts,
and is mirrored in a module-level variable so the hot path (every AI call) never
pays for a DB round-trip.

API keys are NOT stored here — they stay in .env. An admin can only choose
between pre-approved models; they can never inject an arbitrary model name.
"""
import logging

logger = logging.getLogger(__name__)

CONFIG_KEY = "active_ai_model"

# Whitelist — an admin may only pick from these. Anything else is rejected.
#
# Verified against models.list() for this API key. gemini-2.0-flash and
# gemini-2.5-flash were checked and are RETIRED (the API returns 404), so they
# are deliberately not offered. Costs are list prices and may drift; they only
# affect the estimated-spend display, never routing.
AVAILABLE_MODELS: dict[str, dict] = {
    "gemini-3.6-flash": {
        "label": "Gemini 3.6 Flash",
        "provider": "gemini",
        "description": "Newest generation. Best quality, own daily quota.",
        "free_tier_daily_limit": 250,
        "input_cost_per_1m": 0.10,
        "output_cost_per_1m": 0.40,
    },
    "gemini-3.5-flash": {
        "label": "Gemini 3.5 Flash",
        "provider": "gemini",
        "description": "High quality, but a tight free tier — 20 requests/day.",
        "free_tier_daily_limit": 20,
        "input_cost_per_1m": 0.075,
        "output_cost_per_1m": 0.30,
    },
    "gemini-3.5-flash-lite": {
        "label": "Gemini 3.5 Flash Lite",
        "provider": "gemini",
        "description": "Fastest and cheapest, with a generous quota. Good default.",
        "free_tier_daily_limit": 1000,
        "input_cost_per_1m": 0.05,
        "output_cost_per_1m": 0.20,
    },
}

DEFAULT_MODEL = "gemini-3.5-flash-lite"

# Hot-path cache. Read on every AI call, written only by set_active_model().
_active_model: str = DEFAULT_MODEL


def get_active_model() -> str:
    """Current model. Cheap — reads the in-memory value, never touches the DB."""
    return _active_model


def get_fallback_chain(current: str) -> list[str]:
    """Models to try, in order, when `current` is rate-limited or unavailable.

    Returns every other whitelisted model so one exhausted quota can't take the
    system down while a healthy model is sitting right there.
    """
    return [name for name in AVAILABLE_MODELS if name != current]


def is_valid_model(model: str) -> bool:
    return model in AVAILABLE_MODELS


async def load_active_model_from_db() -> str:
    """Called once on startup to restore the admin's last choice."""
    global _active_model
    try:
        from app.core.database import AsyncSessionLocal
        from app.models.system_config import SystemConfig
        from sqlalchemy import select

        async with AsyncSessionLocal() as db:
            row = (await db.execute(
                select(SystemConfig).where(SystemConfig.key == CONFIG_KEY)
            )).scalar_one_or_none()

            if row and is_valid_model(row.value):
                _active_model = row.value
                logger.info(f"[AI] Active model restored from DB: {_active_model}")
            else:
                # No row yet (or a stale/unknown value) — seed the default.
                if row:
                    logger.warning(f"[AI] Ignoring unknown stored model '{row.value}'")
                    row.value = DEFAULT_MODEL
                else:
                    db.add(SystemConfig(key=CONFIG_KEY, value=DEFAULT_MODEL))
                await db.commit()
                _active_model = DEFAULT_MODEL
                logger.info(f"[AI] Active model seeded to default: {_active_model}")
    except Exception as e:
        # Never block startup on this — fall back to the module default.
        logger.warning(f"[AI] Could not load active model from DB ({e}); using {DEFAULT_MODEL}")
        _active_model = DEFAULT_MODEL
    return _active_model


async def set_active_model(model: str, admin_id: str | None = None) -> str:
    """Switch the active model. Updates memory first (instant), then persists."""
    global _active_model

    if not is_valid_model(model):
        raise ValueError(f"Unknown model '{model}'. Allowed: {', '.join(AVAILABLE_MODELS)}")

    previous = _active_model
    _active_model = model  # takes effect immediately, before the DB write

    from app.core.database import AsyncSessionLocal
    from app.models.system_config import SystemConfig
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        row = (await db.execute(
            select(SystemConfig).where(SystemConfig.key == CONFIG_KEY)
        )).scalar_one_or_none()
        if row:
            row.value = model
            row.updated_by = admin_id
        else:
            db.add(SystemConfig(key=CONFIG_KEY, value=model, updated_by=admin_id))
        await db.commit()

    logger.info(f"[AI] Active model changed: {previous} -> {model} (by {admin_id or 'system'})")
    return model
