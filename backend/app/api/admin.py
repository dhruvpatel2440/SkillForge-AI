import logging
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete, cast, case, Date as SaDate

from app.core.config import get_settings
from app.core.database import get_db
from app.core.admin_auth import require_admin
from app.models.profile import Profile
from app.models.resume import Resume, ResumeAnalysis
from app.models.gap_analysis import GapAnalysis
from app.models.roadmap import Roadmap
from app.models.quiz import Quiz, QuizAttempt
from app.models.interview import InterviewQuestion, InterviewAttempt
from app.models.ai_usage import AIUsageLog, AIModelPricing
from app.models.audit import AdminAuditLog
from app.schemas.common import ok

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin", tags=["admin"])
_settings = get_settings()


class AdminLoginRequest(BaseModel):
    password: str


@router.post("/login")
async def admin_login(body: AdminLoginRequest):
    if body.password != _settings.admin_secret_key:
        raise HTTPException(status_code=401, detail="Invalid admin password")
    return ok(data={"token": _settings.admin_secret_key})


# ── Dashboard ────────────────────────────────────────────────────────────────

@router.get("/dashboard")
async def admin_dashboard(
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    total_users = (await db.execute(select(func.count(Profile.id)))).scalar() or 0
    total_resumes = (await db.execute(select(func.count(Resume.id)))).scalar() or 0
    total_roadmaps = (await db.execute(select(func.count(Roadmap.id)))).scalar() or 0

    since_24h = datetime.now(timezone.utc) - timedelta(hours=24)
    active_24h = (await db.execute(
        select(func.count(AIUsageLog.id)).where(AIUsageLog.created_at >= since_24h)
    )).scalar() or 0

    total_tokens = (await db.execute(select(func.sum(AIUsageLog.total_tokens)))).scalar() or 0
    total_cost = (await db.execute(select(func.sum(AIUsageLog.estimated_cost)))).scalar() or 0.0
    total_ai_calls = (await db.execute(select(func.count(AIUsageLog.id)))).scalar() or 0

    return ok(data={
        "total_users": total_users,
        "total_resumes": total_resumes,
        "total_roadmaps": total_roadmaps,
        "active_ai_calls_24h": active_24h,
        "total_ai_calls": total_ai_calls,
        "total_tokens_used": total_tokens,
        "total_estimated_cost_usd": round(float(total_cost), 6) if total_cost else 0.0,
    })


# ── Users ────────────────────────────────────────────────────────────────────

@router.get("/users")
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * page_size
    total = (await db.execute(select(func.count(Profile.id)))).scalar() or 0
    profiles = (await db.execute(
        select(Profile).order_by(Profile.created_at.desc()).offset(offset).limit(page_size)
    )).scalars().all()
    return ok(data={
        "total": total,
        "page": page,
        "page_size": page_size,
        "users": [_serialize_profile(p) for p in profiles],
    })


@router.get("/users/{target_user_id}")
async def get_user(
    target_user_id: str,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    profile = (await db.execute(
        select(Profile).where(Profile.user_id == target_user_id)
    )).scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")

    resume_count = (await db.execute(
        select(func.count(Resume.id)).where(Resume.user_id == target_user_id)
    )).scalar() or 0
    roadmap_count = (await db.execute(
        select(func.count(Roadmap.id)).where(Roadmap.user_id == target_user_id)
    )).scalar() or 0
    ai_call_count = (await db.execute(
        select(func.count(AIUsageLog.id)).where(AIUsageLog.user_id == target_user_id)
    )).scalar() or 0

    return ok(data={
        **_serialize_profile(profile),
        "resume_count": resume_count,
        "roadmap_count": roadmap_count,
        "ai_call_count": ai_call_count,
    })


class RoleUpdate(BaseModel):
    role: str


@router.patch("/users/{target_user_id}/role")
async def update_user_role(
    target_user_id: str,
    body: RoleUpdate,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    if body.role not in ("user", "admin"):
        raise HTTPException(status_code=400, detail="role must be 'user' or 'admin'")

    profile = (await db.execute(
        select(Profile).where(Profile.user_id == target_user_id)
    )).scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")

    old_role = profile.role
    profile.role = body.role
    await db.commit()

    db.add(AdminAuditLog(
        admin_user_id=admin_id,
        action="update_role",
        target_type="user",
        target_id=target_user_id,
        log_metadata={"old_role": old_role, "new_role": body.role},
    ))
    await db.commit()

    return ok(data={"user_id": target_user_id, "role": body.role})


@router.delete("/users/{target_user_id}")
async def delete_user(
    target_user_id: str,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    profile = (await db.execute(
        select(Profile).where(Profile.user_id == target_user_id)
    )).scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")

    await db.execute(delete(Profile).where(Profile.user_id == target_user_id))
    await db.commit()

    db.add(AdminAuditLog(
        admin_user_id=admin_id,
        action="delete_user",
        target_type="user",
        target_id=target_user_id,
        log_metadata={"email": profile.email},
    ))
    await db.commit()

    return ok(message="User deleted")


# ── Content browsing ─────────────────────────────────────────────────────────

@router.get("/resumes")
async def list_resumes(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * page_size
    total = (await db.execute(select(func.count(Resume.id)))).scalar() or 0
    resumes = (await db.execute(
        select(Resume).order_by(Resume.created_at.desc()).offset(offset).limit(page_size)
    )).scalars().all()
    return ok(data={
        "total": total,
        "page": page,
        "page_size": page_size,
        "resumes": [
            {
                "id": r.id, "user_id": r.user_id, "file_name": r.file_name,
                "processing_status": r.processing_status,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in resumes
        ],
    })


@router.get("/roadmaps")
async def list_roadmaps(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * page_size
    total = (await db.execute(select(func.count(Roadmap.id)))).scalar() or 0
    roadmaps = (await db.execute(
        select(Roadmap).order_by(Roadmap.created_at.desc()).offset(offset).limit(page_size)
    )).scalars().all()
    return ok(data={
        "total": total,
        "page": page,
        "page_size": page_size,
        "roadmaps": [
            {
                "id": r.id, "user_id": r.user_id, "target_role": r.target_role,
                "duration_weeks": r.duration_weeks,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in roadmaps
        ],
    })


@router.get("/quizzes")
async def list_quizzes(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * page_size
    total = (await db.execute(select(func.count(Quiz.id)))).scalar() or 0
    quizzes = (await db.execute(
        select(Quiz).order_by(Quiz.created_at.desc()).offset(offset).limit(page_size)
    )).scalars().all()

    # Pull every attempt for this page in one query — no N+1.
    quiz_ids = [q.id for q in quizzes]
    attempts_by_quiz: dict[str, list[QuizAttempt]] = {}
    if quiz_ids:
        attempts = (await db.execute(
            select(QuizAttempt)
            .where(QuizAttempt.quiz_id.in_(quiz_ids))
            .order_by(QuizAttempt.completed_at.asc())
        )).scalars().all()
        for a in attempts:
            attempts_by_quiz.setdefault(a.quiz_id, []).append(a)

    def _attempt_summary(quiz: Quiz) -> dict:
        rows = attempts_by_quiz.get(quiz.id, [])
        scored = [r for r in rows if r.score is not None]
        if not scored:
            return {
                "attempt_count": len(rows),
                "best_score": None,
                "latest_score": None,
                "average_score": None,
                "passed": None,
                "last_attempt_at": None,
            }

        latest = scored[-1]  # ordered by completed_at asc above
        best = max(float(r.score) for r in scored)

        # Trust the flag the quiz engine stored; derive only if it was never set.
        flags = [r.passed for r in scored if r.passed is not None]
        passed = any(flags) if flags else best >= (quiz.passing_score or 0)

        return {
            "attempt_count": len(rows),
            "best_score": round(best, 1),
            "latest_score": round(float(latest.score), 1),
            "average_score": round(sum(float(r.score) for r in scored) / len(scored), 1),
            "passed": passed,
            "last_attempt_at": latest.completed_at.isoformat() if latest.completed_at else None,
        }

    return ok(data={
        "total": total,
        "page": page,
        "page_size": page_size,
        "quizzes": [
            {
                "id": q.id, "user_id": q.user_id, "title": q.title,
                "passing_score": q.passing_score,
                "question_count": len(q.questions) if isinstance(q.questions, list) else 0,
                "created_at": q.created_at.isoformat() if q.created_at else None,
                **_attempt_summary(q),
            }
            for q in quizzes
        ],
    })


@router.get("/interviews")
async def list_interviews(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * page_size
    total = (await db.execute(select(func.count(InterviewAttempt.id)))).scalar() or 0
    attempts = (await db.execute(
        select(InterviewAttempt).order_by(InterviewAttempt.created_at.desc()).offset(offset).limit(page_size)
    )).scalars().all()
    return ok(data={
        "total": total,
        "page": page,
        "page_size": page_size,
        "attempts": [
            {
                "id": a.id, "user_id": a.user_id, "question_id": a.question_id,
                "score": a.score,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in attempts
        ],
    })


# ── AI Usage ─────────────────────────────────────────────────────────────────

@router.get("/ai-usage")
async def list_ai_usage(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    feature: str = Query(None),
    status: str = Query(None),
    start_date: str = Query(None),
    end_date: str = Query(None),
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(AIUsageLog).order_by(AIUsageLog.created_at.desc())
    if feature:
        query = query.where(AIUsageLog.feature == feature)
    if status:
        query = query.where(AIUsageLog.status == status)
    if start_date:
        query = query.where(AIUsageLog.created_at >= datetime.fromisoformat(start_date))
    if end_date:
        query = query.where(AIUsageLog.created_at <= datetime.fromisoformat(end_date))

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    offset = (page - 1) * page_size
    logs = (await db.execute(query.offset(offset).limit(page_size))).scalars().all()

    return ok(data={
        "total": total,
        "page": page,
        "page_size": page_size,
        "logs": [_serialize_usage_log(l) for l in logs],
    })


@router.get("/ai-usage/by-model")
async def ai_usage_by_model(
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    rows = (await db.execute(
        select(
            AIUsageLog.model,
            func.count(AIUsageLog.id).label("calls"),
            func.sum(AIUsageLog.total_tokens).label("tokens"),
            func.sum(AIUsageLog.estimated_cost).label("cost"),
        ).group_by(AIUsageLog.model)
    )).all()
    return ok(data=[
        {"model": r.model, "calls": r.calls, "total_tokens": r.tokens or 0,
         "estimated_cost_usd": round(float(r.cost or 0), 6)}
        for r in rows
    ])


@router.get("/ai-usage/by-feature")
async def ai_usage_by_feature(
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    rows = (await db.execute(
        select(
            AIUsageLog.feature,
            func.count(AIUsageLog.id).label("calls"),
            func.sum(AIUsageLog.total_tokens).label("tokens"),
            func.sum(AIUsageLog.estimated_cost).label("cost"),
            func.avg(AIUsageLog.latency_ms).label("avg_latency"),
        ).group_by(AIUsageLog.feature)
    )).all()
    return ok(data=[
        {
            "feature": r.feature, "calls": r.calls,
            "total_tokens": r.tokens or 0,
            "estimated_cost_usd": round(float(r.cost or 0), 6),
            "avg_latency_ms": round(float(r.avg_latency or 0)),
        }
        for r in rows
    ])


@router.get("/ai-usage/by-user")
async def ai_usage_by_user(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * page_size
    rows = (await db.execute(
        select(
            AIUsageLog.user_id,
            func.count(AIUsageLog.id).label("calls"),
            func.sum(AIUsageLog.total_tokens).label("tokens"),
            func.sum(AIUsageLog.estimated_cost).label("cost"),
        )
        .group_by(AIUsageLog.user_id)
        .order_by(func.sum(AIUsageLog.total_tokens).desc())
        .offset(offset).limit(page_size)
    )).all()
    total = (await db.execute(
        select(func.count(func.distinct(AIUsageLog.user_id)))
    )).scalar() or 0
    return ok(data={
        "total": total,
        "page": page,
        "page_size": page_size,
        "users": [
            {
                "user_id": r.user_id, "calls": r.calls,
                "total_tokens": r.tokens or 0,
                "estimated_cost_usd": round(float(r.cost or 0), 6),
            }
            for r in rows
        ],
    })


@router.get("/ai-usage/timeline")
async def ai_usage_timeline(
    days: int = Query(30, ge=1, le=365),
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    since = datetime.now(timezone.utc) - timedelta(days=days)
    day_col = cast(AIUsageLog.created_at, SaDate)
    rows = (await db.execute(
        select(
            day_col.label("day"),
            func.count(AIUsageLog.id).label("calls"),
            func.sum(AIUsageLog.total_tokens).label("tokens"),
            func.sum(AIUsageLog.estimated_cost).label("cost"),
        )
        .where(AIUsageLog.created_at >= since)
        .group_by(day_col)
        .order_by(day_col)
    )).all()
    return ok(data=[
        {
            "date": r.day.isoformat() if r.day else None,
            "calls": r.calls,
            "total_tokens": r.tokens or 0,
            "estimated_cost_usd": round(float(r.cost or 0), 6),
        }
        for r in rows
    ])


# ── AI Usage Live ────────────────────────────────────────────────────────────

@router.get("/ai-usage/live")
async def ai_usage_live(
    minutes: int = Query(5, ge=1, le=60),
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    since = datetime.now(timezone.utc) - timedelta(minutes=minutes)

    total_calls = (await db.execute(
        select(func.count(AIUsageLog.id)).where(AIUsageLog.created_at >= since)
    )).scalar() or 0

    total_tokens = (await db.execute(
        select(func.sum(AIUsageLog.total_tokens)).where(AIUsageLog.created_at >= since)
    )).scalar() or 0

    total_cost = (await db.execute(
        select(func.sum(AIUsageLog.estimated_cost)).where(AIUsageLog.created_at >= since)
    )).scalar() or 0.0

    avg_latency = (await db.execute(
        select(func.avg(AIUsageLog.latency_ms)).where(AIUsageLog.created_at >= since)
    )).scalar() or 0

    success_count = (await db.execute(
        select(func.count(AIUsageLog.id)).where(
            AIUsageLog.created_at >= since,
            AIUsageLog.status == "success"
        )
    )).scalar() or 0

    by_feature = (await db.execute(
        select(AIUsageLog.feature, func.count(AIUsageLog.id).label("calls"))
        .where(AIUsageLog.created_at >= since)
        .group_by(AIUsageLog.feature)
        .order_by(func.count(AIUsageLog.id).desc())
    )).all()

    recent = (await db.execute(
        select(AIUsageLog).order_by(AIUsageLog.created_at.desc()).limit(20)
    )).scalars().all()

    return ok(data={
        "window_minutes": minutes,
        "since": since.isoformat(),
        "total_calls": total_calls,
        "total_tokens": int(total_tokens),
        "total_cost_usd": round(float(total_cost), 6) if total_cost else 0.0,
        "avg_latency_ms": round(float(avg_latency)) if avg_latency else 0,
        "success_rate": round(success_count / total_calls * 100) if total_calls > 0 else 100,
        "by_feature": [{"feature": r.feature, "calls": r.calls} for r in by_feature],
        "recent_logs": [_serialize_usage_log(l) for l in recent],
    })


# ── Audit Logs ───────────────────────────────────────────────────────────────

@router.get("/audit-logs")
async def list_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * page_size
    total = (await db.execute(select(func.count(AdminAuditLog.id)))).scalar() or 0
    logs = (await db.execute(
        select(AdminAuditLog).order_by(AdminAuditLog.created_at.desc()).offset(offset).limit(page_size)
    )).scalars().all()
    return ok(data={
        "total": total,
        "page": page,
        "page_size": page_size,
        "logs": [
            {
                "id": l.id,
                "admin_user_id": l.admin_user_id,
                "action": l.action,
                "target_type": l.target_type,
                "target_id": l.target_id,
                "metadata": l.log_metadata,
                "created_at": l.created_at.isoformat() if l.created_at else None,
            }
            for l in logs
        ],
    })


# ── AI Model Selection ───────────────────────────────────────────────────────

@router.get("/ai-config")
async def get_ai_config(
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Which model is active, what else can be picked, and recent per-model health."""
    from app.core.ai_config import get_active_model, AVAILABLE_MODELS

    active = get_active_model()
    since_24h = datetime.now(timezone.utc) - timedelta(hours=24)

    # Per-model call counts for the last 24h so the admin can see quota burn.
    rows = (await db.execute(
        select(
            AIUsageLog.model,
            func.count(AIUsageLog.id).label("calls"),
            func.sum(
                case((AIUsageLog.status == "success", 1), else_=0)
            ).label("successes"),
        )
        .where(AIUsageLog.created_at >= since_24h)
        .group_by(AIUsageLog.model)
    )).all()
    usage_24h = {
        r.model: {"calls": r.calls, "successes": int(r.successes or 0)}
        for r in rows
    }

    return ok(data={
        "active_model": active,
        "models": [
            {
                "id": model_id,
                "label": meta["label"],
                "provider": meta["provider"],
                "description": meta["description"],
                "free_tier_daily_limit": meta["free_tier_daily_limit"],
                "input_cost_per_1m": meta["input_cost_per_1m"],
                "output_cost_per_1m": meta["output_cost_per_1m"],
                "is_active": model_id == active,
                "calls_24h": usage_24h.get(model_id, {}).get("calls", 0),
                "successes_24h": usage_24h.get(model_id, {}).get("successes", 0),
            }
            for model_id, meta in AVAILABLE_MODELS.items()
        ],
    })


class AIModelUpdate(BaseModel):
    model: str


@router.patch("/ai-config")
async def update_ai_config(
    body: AIModelUpdate,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Switch the system-wide AI model. Takes effect immediately, no restart."""
    from app.core.ai_config import get_active_model, set_active_model

    previous = get_active_model()
    try:
        new_model = await set_active_model(body.model, admin_id=admin_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    db.add(AdminAuditLog(
        admin_user_id=admin_id,
        action="update_ai_model",
        target_type="system_config",
        target_id="active_ai_model",
        log_metadata={"old_model": previous, "new_model": new_model},
    ))
    await db.commit()

    return ok(
        data={"active_model": new_model, "previous_model": previous},
        message=f"AI model switched to {new_model}",
    )


# ── System ───────────────────────────────────────────────────────────────────

@router.get("/system")
async def system_info(
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    pricing = (await db.execute(select(AIModelPricing).where(AIModelPricing.active == True))).scalars().all()
    return ok(data={
        "active_pricing": [
            {
                "model": p.model, "provider": p.provider,
                "input_cost_per_1m": p.input_cost_per_1m_tokens,
                "output_cost_per_1m": p.output_cost_per_1m_tokens,
                "currency": p.currency,
            }
            for p in pricing
        ],
    })


# ── Helpers ──────────────────────────────────────────────────────────────────

def _serialize_profile(p: Profile) -> dict:
    return {
        "id": p.id,
        "user_id": p.user_id,
        "full_name": p.full_name,
        "email": p.email,
        "role": p.role,
        "onboarding_completed": p.onboarding_completed,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }


def _serialize_usage_log(l: AIUsageLog) -> dict:
    return {
        "id": l.id,
        "user_id": l.user_id,
        "request_id": l.request_id,
        "feature": l.feature,
        "model": l.model,
        "input_tokens": l.input_tokens,
        "output_tokens": l.output_tokens,
        "total_tokens": l.total_tokens,
        "estimated_cost_usd": round(float(l.estimated_cost or 0), 6),
        "latency_ms": l.latency_ms,
        "status": l.status,
        "error_message": l.error_message,
        "created_at": l.created_at.isoformat() if l.created_at else None,
    }
