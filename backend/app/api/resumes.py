import os
import logging
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

logger = logging.getLogger(__name__)

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.profile import Profile
from app.models.resume import Resume, ResumeAnalysis
from app.models.career_preferences import CareerPreferences
from app.models.skill import Skill
from app.models.project import Project
from app.models.experience import Experience
from app.models.education import Education
from app.models.certification import Certification
from app.models.gap_analysis import GapAnalysis
from app.models.roadmap import Roadmap, RoadmapWeek, RoadmapTask
from app.services.resume_parser import calculate_hash, extract_text
from app.services.storage import save_resume_file
from app.services.markdown_converter import convert_to_markdown
from app.services.resume_analyzer import analyze_resume
from app.services.gap_engine import generate_gap_analysis
from app.services.roadmap_engine import generate_roadmap
from app.schemas.common import ok, err

router = APIRouter(prefix="/api/resumes", tags=["resumes"])
settings = get_settings()

ALLOWED_TYPES = {"application/pdf", "application/octet-stream"}


async def _auto_generate_pipeline(db: AsyncSession, user_id: str, resume_id: str, markdown: str, analysis_data: dict):
    """Auto-generate gap analysis and roadmap, then mark onboarding as completed."""
    # Need career preferences to proceed
    prefs = (await db.execute(
        select(CareerPreferences).where(CareerPreferences.user_id == user_id)
    )).scalar_one_or_none()
    if not prefs:
        logger.info(f"No career preferences for {user_id} — skipping auto-pipeline")
        return

    # --- Gap analysis (skip if already exists for this role) ---
    existing_gap = (await db.execute(
        select(GapAnalysis)
        .where(GapAnalysis.user_id == user_id, GapAnalysis.target_role == prefs.target_role)
        .order_by(GapAnalysis.created_at.desc())
        .limit(1)
    )).scalar_one_or_none()

    if not existing_gap:
        skills = (await db.execute(select(Skill).where(Skill.user_id == user_id))).scalars().all()
        projects = (await db.execute(select(Project).where(Project.user_id == user_id))).scalars().all()
        experience = (await db.execute(select(Experience).where(Experience.user_id == user_id))).scalars().all()

        gap_result = await generate_gap_analysis(
            markdown=markdown,
            skills=[{
                "name": s.name,
                "proficiency": s.proficiency,
                "classification": s.classification or "claimed",
                "confidence": s.confidence or 0.3,
                "years_estimated": s.years_estimated or 0.0,
                "evidence_strength": s.evidence_strength,
                "evidence": s.evidence,
            } for s in skills],
            projects=[{"name": p.name, "description": p.description, "technologies": p.technologies} for p in projects],
            experience=[{"company": e.company, "role": e.role, "description": e.description} for e in experience],
            target_role=prefs.target_role,
            timeline_months=prefs.timeline_months,
            weekly_hours=prefs.weekly_hours,
            user_id=user_id,
        )

        existing_gap = GapAnalysis(
            user_id=user_id,
            resume_id=resume_id,
            target_role=prefs.target_role,
            readiness_score=gap_result.get("readiness_score", 0),
            strengths=gap_result.get("strengths", []),
            gaps=gap_result.get("missing_skills", []),
            missing_skills=gap_result.get("missing_skills", []),
            weak_evidence_skills=gap_result.get("weak_skills", []),
            recommendations=gap_result.get("recommendations", []),
            score_breakdown=gap_result.get("score_breakdown", {}),
            raw_ai_response=gap_result,
        )
        db.add(existing_gap)
        await db.commit()
        await db.refresh(existing_gap)
        logger.info(f"Auto-generated gap analysis for {user_id}")

    # --- Roadmap (skip if already exists for this role) ---
    existing_roadmap = (await db.execute(
        select(Roadmap)
        .where(Roadmap.user_id == user_id, Roadmap.target_role == prefs.target_role)
        .order_by(Roadmap.created_at.desc())
        .limit(1)
    )).scalar_one_or_none()

    if not existing_roadmap:
        weeks_data = await generate_roadmap(
            target_role=prefs.target_role,
            timeline_months=prefs.timeline_months,
            weekly_hours=prefs.weekly_hours,
            gap_analysis=existing_gap.raw_ai_response or {},
            user_id=user_id,
        )

        roadmap = Roadmap(
            user_id=user_id,
            target_role=prefs.target_role,
            duration_weeks=len(weeks_data),
            weekly_hours=prefs.weekly_hours,
            gap_analysis_id=existing_gap.id,
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
                db.add(RoadmapTask(
                    roadmap_week_id=week.id,
                    title=t.get("title", ""),
                    description=t.get("description", ""),
                    task_type=t.get("task_type", "learning"),
                    estimated_hours=t.get("estimated_hours", 1.0),
                ))

        await db.commit()
        logger.info(f"Auto-generated roadmap for {user_id}")

    # --- Mark onboarding completed ---
    profile = (await db.execute(select(Profile).where(Profile.user_id == user_id))).scalar_one_or_none()
    if profile:
        profile.onboarding_completed = True
    else:
        profile = Profile(user_id=user_id, onboarding_completed=True)
        db.add(profile)
    await db.commit()
    logger.info(f"Onboarding marked complete for {user_id}")


async def _process_resume(resume_id: str, user_id: str, content: bytes, markdown: str):
    from app.core.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Resume).where(Resume.id == resume_id))
        resume = result.scalar_one_or_none()
        if not resume:
            return

        try:
            resume.processing_status = "analyzing"
            await db.commit()

            analysis_data = await analyze_resume(markdown, user_id=user_id)

            # Delete old derived data so re-uploads don't create duplicates
            await db.execute(delete(Skill).where(Skill.user_id == user_id))
            await db.execute(delete(Project).where(Project.user_id == user_id))
            await db.execute(delete(Experience).where(Experience.user_id == user_id))
            await db.execute(delete(Education).where(Education.user_id == user_id))
            await db.execute(delete(Certification).where(Certification.user_id == user_id))
            await db.commit()

            analysis = ResumeAnalysis(
                resume_id=resume_id,
                user_id=user_id,
                summary=analysis_data.get("candidate", {}).get("summary", ""),
                raw_ai_response=analysis_data,
            )
            db.add(analysis)
            await db.flush()

            for s in analysis_data.get("skills", []):
                db.add(Skill(
                    user_id=user_id,
                    resume_analysis_id=analysis.id,
                    name=s.get("name", ""),
                    category=s.get("category", ""),
                    proficiency=s.get("proficiency", "beginner"),
                    confidence=float(s.get("confidence", 0.3)),
                    classification=s.get("classification", "claimed"),
                    years_estimated=float(s.get("years_estimated", 0.0)),
                    evidence=s.get("evidence", ""),
                    evidence_source=s.get("evidence_source", ""),
                    evidence_strength=s.get("evidence_strength", "weak"),
                ))

            for p in analysis_data.get("projects", []):
                db.add(Project(
                    user_id=user_id,
                    resume_analysis_id=analysis.id,
                    name=p.get("name", ""),
                    description=p.get("description", ""),
                    technologies=p.get("technologies", []),
                    role=p.get("role", ""),
                    evidence=p.get("evidence", ""),
                ))

            for exp in analysis_data.get("experience", []):
                db.add(Experience(
                    user_id=user_id,
                    resume_analysis_id=analysis.id,
                    company=exp.get("company", ""),
                    role=exp.get("role", ""),
                    start_date=exp.get("start_date", ""),
                    end_date=exp.get("end_date", ""),
                    description=exp.get("description", ""),
                    technologies=exp.get("technologies", []),
                ))

            for edu in analysis_data.get("education", []):
                db.add(Education(
                    user_id=user_id,
                    resume_analysis_id=analysis.id,
                    institution=edu.get("institution", ""),
                    degree=edu.get("degree", ""),
                    field=edu.get("field", ""),
                    start_date=edu.get("start_date", ""),
                    end_date=edu.get("end_date", ""),
                ))

            for cert in analysis_data.get("certifications", []):
                db.add(Certification(
                    user_id=user_id,
                    resume_analysis_id=analysis.id,
                    name=cert.get("name", ""),
                    issuer=cert.get("issuer", ""),
                    date=cert.get("date", ""),
                ))

            await db.commit()

        except Exception as e:
            logger.error(f"Resume analysis failed for {resume_id}: {e}", exc_info=True)
            resume.processing_status = "failed"
            await db.commit()
            return

        # Auto-pipeline: gap analysis → roadmap → onboarding_completed
        # This runs after resume analysis succeeds. If it fails, resume still marks completed.
        try:
            await _auto_generate_pipeline(db, user_id, resume_id, markdown, analysis_data)
        except Exception as e:
            logger.error(f"Auto-pipeline failed for {user_id}: {e}", exc_info=True)

        resume.processing_status = "completed"
        await db.commit()


@router.post("/upload")
async def upload_resume(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a valid PDF resume.")

    content = await file.read()
    if len(content) > settings.max_resume_size_bytes:
        raise HTTPException(status_code=400, detail=f"File exceeds {settings.max_resume_size_mb}MB limit.")

    try:
        extracted = extract_text(content)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    file_hash = calculate_hash(content)
    markdown = convert_to_markdown(extracted)

    # Check for duplicate by hash — if already fully processed, return cached
    result = await db.execute(
        select(Resume)
        .where(Resume.user_id == user_id, Resume.file_hash == file_hash)
        .order_by(Resume.created_at.desc())
        .limit(1)
    )
    existing = result.scalar_one_or_none()
    if existing and existing.processing_status == "completed":
        return ok(data={"resume_id": existing.id, "cached": True}, message="Resume already processed.")

    file_path = await save_resume_file(user_id, content)

    resume = Resume(
        user_id=user_id,
        file_name=file.filename,
        file_path=file_path,
        file_hash=file_hash,
        extracted_text=extracted,
        markdown_content=markdown,
        processing_status="extracting",
    )
    db.add(resume)
    await db.flush()
    resume_id = resume.id
    resume.processing_status = "converted"
    await db.commit()

    background_tasks.add_task(_process_resume, resume_id, user_id, content, markdown)

    return ok(data={"resume_id": resume_id, "status": "processing"}, message="Resume uploaded and processing started")


@router.get("/latest/status")
async def get_latest_resume_status(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    result = await db.execute(
        select(Resume).where(Resume.user_id == user_id).order_by(Resume.created_at.desc()).limit(1)
    )
    resume = result.scalar_one_or_none()
    if not resume:
        return ok(data=None)
    return ok(data={"resume_id": resume.id, "status": resume.processing_status, "file_name": resume.file_name})


@router.get("/{resume_id}")
async def get_resume(
    resume_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    result = await db.execute(
        select(Resume).where(Resume.id == resume_id, Resume.user_id == user_id)
    )
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return ok(data={
        "id": resume.id,
        "file_name": resume.file_name,
        "processing_status": resume.processing_status,
        "created_at": resume.created_at.isoformat() if resume.created_at else None,
    })


@router.get("/{resume_id}/analysis")
async def get_resume_analysis(
    resume_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    res = await db.execute(
        select(Resume).where(Resume.id == resume_id, Resume.user_id == user_id)
    )
    if not res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Resume not found")

    result = await db.execute(
        select(ResumeAnalysis).where(
            ResumeAnalysis.resume_id == resume_id,
            ResumeAnalysis.user_id == user_id,
        )
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        return ok(data=None, message="Analysis not yet complete")
    return ok(data={"summary": analysis.summary, "raw": analysis.raw_ai_response})
