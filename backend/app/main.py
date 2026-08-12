import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import get_settings
from app.core.database import create_tables
import app.models  # noqa: F401 — registers all models with Base.metadata before create_tables()
from app.api import auth, profile, resumes, skills, gap_analysis, roadmap, quiz, interview, dashboard, admin, project_recs

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting SkillForge AI backend...")
    os.makedirs(settings.upload_dir, exist_ok=True)
    try:
        await create_tables()
        logger.info("Database tables ready")
    except Exception as e:
        logger.warning(f"DB init warning (tables may already exist): {e}")

    from app.core.ai_config import load_active_model_from_db
    active_model = await load_active_model_from_db()
    logger.info(f"Active AI model: {active_model}")
    yield
    logger.info("Shutting down...")


app = FastAPI(
    title="SkillForge AI API",
    version="1.0.0",
    description="AI-powered personalized career roadmap platform",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Pass HTTPExceptions through with their original detail intact."""
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch truly unhandled exceptions — never called for HTTPException."""
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again."},
    )


@app.get("/health")
async def health():
    return {"status": "ok", "service": "skillforge-ai"}


# Register routers
app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(resumes.router)
app.include_router(skills.router)
app.include_router(gap_analysis.router)
app.include_router(roadmap.router)
app.include_router(quiz.router)
app.include_router(interview.router)
app.include_router(dashboard.router)
app.include_router(admin.router)
app.include_router(project_recs.router)
