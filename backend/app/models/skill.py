import uuid
from datetime import datetime
from sqlalchemy import String, Float, Text, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class Skill(Base):
    __tablename__ = "skills"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    resume_analysis_id: Mapped[str] = mapped_column(String, nullable=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    category: Mapped[str] = mapped_column(String, nullable=True)
    proficiency: Mapped[str] = mapped_column(String, nullable=True)
    confidence: Mapped[float] = mapped_column(Float, nullable=True)
    evidence: Mapped[str] = mapped_column(Text, nullable=True)
    evidence_source: Mapped[str] = mapped_column(String, nullable=True)
    evidence_strength: Mapped[str] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
