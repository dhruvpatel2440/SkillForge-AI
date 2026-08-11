import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Float, Text, Boolean, DateTime, func, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class Roadmap(Base):
    __tablename__ = "roadmaps"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    target_role: Mapped[str] = mapped_column(String, nullable=False)
    duration_weeks: Mapped[int] = mapped_column(Integer, nullable=False)
    weekly_hours: Mapped[int] = mapped_column(Integer, nullable=False)
    gap_analysis_id: Mapped[str] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class RoadmapWeek(Base):
    __tablename__ = "roadmap_weeks"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    roadmap_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    week_number: Mapped[int] = mapped_column(Integer, nullable=False)
    phase: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    objective: Mapped[str] = mapped_column(Text, nullable=True)
    skills: Mapped[list] = mapped_column(JSON, nullable=True)
    estimated_hours: Mapped[int] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String, default="pending")
    completion_percentage: Mapped[float] = mapped_column(Float, default=0.0)
    checklist: Mapped[list] = mapped_column(JSON, nullable=True)
    completion_criteria: Mapped[list] = mapped_column(JSON, nullable=True)


class RoadmapTask(Base):
    __tablename__ = "roadmap_tasks"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    roadmap_week_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    task_type: Mapped[str] = mapped_column(String, nullable=False)
    estimated_hours: Mapped[float] = mapped_column(Float, nullable=True)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)


class LearningResource(Base):
    __tablename__ = "learning_resources"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    roadmap_week_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    provider: Mapped[str] = mapped_column(String, nullable=True)
    url: Mapped[str] = mapped_column(String, nullable=True)
    resource_type: Mapped[str] = mapped_column(String, nullable=True)
    difficulty: Mapped[str] = mapped_column(String, nullable=True)
    estimated_hours: Mapped[float] = mapped_column(Float, nullable=True)
    reason: Mapped[str] = mapped_column(Text, nullable=True)
    ai_recommended: Mapped[bool] = mapped_column(Boolean, default=True)
