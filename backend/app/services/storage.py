"""Resume file storage.

Uploads go to a Supabase Storage bucket rather than local disk, since the app's
free-tier hosting (Render) wipes local disk on every restart/redeploy. Falls
back to local disk only if Supabase Storage is unreachable, so local dev still
works with an unconfigured bucket.
"""
import logging
import uuid
from pathlib import Path
import aiofiles
from supabase import create_client, Client
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_client: Client | None = None


def _get_client() -> Client | None:
    global _client
    if _client is not None:
        return _client
    if not (settings.supabase_url and settings.supabase_service_role_key):
        return None
    _client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    return _client


async def save_resume_file(user_id: str, content: bytes) -> str:
    """Persist a resume PDF and return a stable reference to it.

    Returns "supabase://<bucket>/<path>" on success, or a local filesystem path
    if Supabase Storage isn't configured/reachable. The reference is stored in
    Resume.file_path but never re-read by the app — the extracted text/markdown
    in Postgres is what the pipeline actually depends on.
    """
    object_path = f"{user_id}/{uuid.uuid4()}.pdf"
    client = _get_client()

    if client is not None:
        try:
            client.storage.from_(settings.supabase_storage_bucket).upload(
                object_path, content, {"content-type": "application/pdf"}
            )
            return f"supabase://{settings.supabase_storage_bucket}/{object_path}"
        except Exception as e:
            logger.warning(f"Supabase Storage upload failed, falling back to local disk: {e}")

    upload_dir = Path(settings.upload_dir) / user_id
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / f"{uuid.uuid4()}.pdf"
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)
    return str(file_path)
