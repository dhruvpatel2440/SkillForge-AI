from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.skill import Skill
from app.models.project import Project
from app.models.experience import Experience
from app.models.education import Education
from app.models.certification import Certification
from app.schemas.common import ok

router = APIRouter(prefix="/api", tags=["skills"])


@router.get("/skills")
async def get_skills(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    result = await db.execute(select(Skill).where(Skill.user_id == user_id))
    skills = result.scalars().all()
    return ok(data=[{
        "id": s.id,
        "name": s.name,
        "category": s.category,
        "proficiency": s.proficiency,
        "confidence": s.confidence,
        "evidence": s.evidence,
        "evidence_source": s.evidence_source,
        "evidence_strength": s.evidence_strength,
    } for s in skills])


@router.get("/projects")
async def get_projects(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    result = await db.execute(select(Project).where(Project.user_id == user_id))
    projects = result.scalars().all()
    return ok(data=[{
        "id": p.id,
        "name": p.name,
        "description": p.description,
        "technologies": p.technologies,
        "role": p.role,
        "evidence": p.evidence,
    } for p in projects])


@router.get("/experience")
async def get_experience(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    result = await db.execute(select(Experience).where(Experience.user_id == user_id))
    exps = result.scalars().all()
    return ok(data=[{
        "id": e.id,
        "company": e.company,
        "role": e.role,
        "start_date": e.start_date,
        "end_date": e.end_date,
        "description": e.description,
        "technologies": e.technologies,
    } for e in exps])
