from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.roadmap import Roadmap, RoadmapWeek, RoadmapTask, LearningResource
from app.models.gap_analysis import GapAnalysis
from app.models.career_preferences import CareerPreferences
from app.services.roadmap_engine import generate_roadmap
from app.services.resource_engine import generate_resources
from app.services.quiz_engine import generate_quiz
from app.models.quiz import Quiz
from app.schemas.common import ok

router = APIRouter(prefix="/api/roadmaps", tags=["roadmaps"])


@router.post("/generate")
async def generate_roadmap_endpoint(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    prefs_result = await db.execute(select(CareerPreferences).where(CareerPreferences.user_id == user_id))
    prefs = prefs_result.scalar_one_or_none()
    if not prefs:
        raise HTTPException(status_code=400, detail="Set career preferences first")

    gap_result = await db.execute(
        select(GapAnalysis).where(GapAnalysis.user_id == user_id)
        .order_by(GapAnalysis.created_at.desc()).limit(1)
    )
    gap = gap_result.scalar_one_or_none()
    if not gap:
        raise HTTPException(status_code=400, detail="Generate gap analysis first")

    # Check existing roadmap
    existing = await db.execute(
        select(Roadmap).where(
            Roadmap.user_id == user_id,
            Roadmap.target_role == prefs.target_role,
        ).order_by(Roadmap.created_at.desc()).limit(1)
    )
    existing_roadmap = existing.scalar_one_or_none()
    if existing_roadmap:
        return ok(data={"roadmap_id": existing_roadmap.id}, message="Roadmap already exists")

    try:
        weeks_data = await generate_roadmap(
            target_role=prefs.target_role,
            timeline_months=prefs.timeline_months,
            weekly_hours=prefs.weekly_hours,
            gap_analysis=gap.raw_ai_response or {},
            user_id=user_id,
        )
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e) if str(e) else "Roadmap generation failed. Try again.")

    roadmap = Roadmap(
        user_id=user_id,
        target_role=prefs.target_role,
        duration_weeks=len(weeks_data),
        weekly_hours=prefs.weekly_hours,
        gap_analysis_id=gap.id,
    )
    db.add(roadmap)
    await db.flush()

    for w in weeks_data:
        week = RoadmapWeek(
            roadmap_id=roadmap.id,
            week_number=w.get("week", 0),
            phase=w.get("phase", "foundation"),
            title=w.get("title", ""),
            objective=w.get("objective", ""),
            skills=w.get("skills", []),
            estimated_hours=w.get("estimated_hours", prefs.weekly_hours),
            checklist=w.get("checklist", []),
            completion_criteria=w.get("completion_criteria", []),
        )
        db.add(week)
        await db.flush()

        for t in w.get("tasks", []):
            task = RoadmapTask(
                roadmap_week_id=week.id,
                title=t.get("title", ""),
                description=t.get("description", ""),
                task_type=t.get("task_type", "learning"),
                estimated_hours=t.get("estimated_hours", 1.0),
            )
            db.add(task)

    await db.commit()
    return ok(data={"roadmap_id": roadmap.id}, message="Roadmap generated successfully")


@router.get("/current")
async def get_current_roadmap(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    result = await db.execute(
        select(Roadmap).where(Roadmap.user_id == user_id)
        .order_by(Roadmap.created_at.desc()).limit(1)
    )
    roadmap = result.scalar_one_or_none()
    if not roadmap:
        return ok(data=None)
    return ok(data={"id": roadmap.id, "target_role": roadmap.target_role,
                    "duration_weeks": roadmap.duration_weeks, "weekly_hours": roadmap.weekly_hours})


@router.get("/{roadmap_id}/weeks")
async def get_roadmap_weeks(
    roadmap_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    rm = await db.execute(select(Roadmap).where(Roadmap.id == roadmap_id, Roadmap.user_id == user_id))
    if not rm.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Roadmap not found")

    weeks = (await db.execute(
        select(RoadmapWeek).where(RoadmapWeek.roadmap_id == roadmap_id)
        .order_by(RoadmapWeek.week_number)
    )).scalars().all()

    return ok(data=[_serialize_week(w) for w in weeks])


@router.get("/weeks/{week_id}")
async def get_week_detail(
    week_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    week_result = await db.execute(select(RoadmapWeek).where(RoadmapWeek.id == week_id))
    week = week_result.scalar_one_or_none()
    if not week:
        raise HTTPException(status_code=404, detail="Week not found")

    # Ownership check via roadmap
    rm = (await db.execute(select(Roadmap).where(Roadmap.id == week.roadmap_id, Roadmap.user_id == user_id))).scalar_one_or_none()
    if not rm:
        raise HTTPException(status_code=403, detail="Access denied")

    tasks = (await db.execute(select(RoadmapTask).where(RoadmapTask.roadmap_week_id == week_id))).scalars().all()
    resources = (await db.execute(select(LearningResource).where(LearningResource.roadmap_week_id == week_id))).scalars().all()

    # Generate resources lazily if none exist
    if not resources:
        try:
            resources_data = await generate_resources(
                week_title=week.title,
                objective=week.objective or "",
                skills=week.skills or [],
                phase=week.phase,
                estimated_hours=week.estimated_hours or 8,
                user_id=user_id,
            )
            for r in resources_data:
                res = LearningResource(
                    roadmap_week_id=week_id,
                    title=r.get("title", ""),
                    provider=r.get("provider", ""),
                    url=r.get("url", ""),
                    resource_type=r.get("resource_type", "course"),
                    difficulty=r.get("difficulty", "beginner"),
                    estimated_hours=r.get("estimated_hours", 2.0),
                    reason=r.get("reason", ""),
                )
                db.add(res)
            await db.commit()
            resources = (await db.execute(select(LearningResource).where(LearningResource.roadmap_week_id == week_id))).scalars().all()
        except Exception:
            resources = []

    return ok(data={
        **_serialize_week(week),
        "tasks": [{"id": t.id, "title": t.title, "description": t.description,
                   "task_type": t.task_type, "estimated_hours": t.estimated_hours, "completed": t.completed}
                  for t in tasks],
        "resources": [{"id": r.id, "title": r.title, "provider": r.provider, "url": r.url,
                       "resource_type": r.resource_type, "difficulty": r.difficulty,
                       "estimated_hours": r.estimated_hours, "reason": r.reason}
                      for r in resources],
    })


def _serialize_week(w: RoadmapWeek) -> dict:
    return {
        "id": w.id,
        "week_number": w.week_number,
        "phase": w.phase,
        "title": w.title,
        "objective": w.objective,
        "skills": w.skills,
        "estimated_hours": w.estimated_hours,
        "status": w.status,
        "completion_percentage": w.completion_percentage,
        "checklist": w.checklist,
        "completion_criteria": w.completion_criteria,
    }


class TaskUpdate(BaseModel):
    completed: bool


@router.patch("/tasks/{task_id}")
async def update_task(
    task_id: str,
    body: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    task_result = await db.execute(select(RoadmapTask).where(RoadmapTask.id == task_id))
    task = task_result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.completed = body.completed

    # Update week completion percentage
    all_tasks = (await db.execute(select(RoadmapTask).where(RoadmapTask.roadmap_week_id == task.roadmap_week_id))).scalars().all()
    done = sum(1 for t in all_tasks if t.completed)
    pct = (done / len(all_tasks) * 100) if all_tasks else 0

    week_result = await db.execute(select(RoadmapWeek).where(RoadmapWeek.id == task.roadmap_week_id))
    week = week_result.scalar_one_or_none()
    if week:
        week.completion_percentage = pct
        if pct >= 100:
            week.status = "completed"
        elif pct > 0:
            week.status = "in_progress"

    await db.commit()
    return ok(data={"task_id": task_id, "completed": body.completed, "week_completion": pct})
