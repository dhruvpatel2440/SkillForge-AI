import uuid
from datetime import datetime
from sqlalchemy import String, Float, Text, DateTime, func, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class GapAnalysis(Base):
    __tablename__ = "gap_analysis"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    resume_id: Mapped[str] = mapped_column(String, nullable=True)
    target_role: Mapped[str] = mapped_column(String, nullable=False)
    readiness_score: Mapped[float] = mapped_column(Float, nullable=True)
    strengths: Mapped[list] = mapped_column(JSON, nullable=True)
    gaps: Mapped[list] = mapped_column(JSON, nullable=True)
    missing_skills: Mapped[list] = mapped_column(JSON, nullable=True)
    weak_evidence_skills: Mapped[list] = mapped_column(JSON, nullable=True)
    recommendations: Mapped[list] = mapped_column(JSON, nullable=True)
    score_breakdown: Mapped[dict] = mapped_column(JSON, nullable=True)
    raw_ai_response: Mapped[dict] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
