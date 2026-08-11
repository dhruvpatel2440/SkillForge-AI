import uuid
from datetime import datetime
from sqlalchemy import String, Float, Text, DateTime, func, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class InterviewQuestion(Base):
    __tablename__ = "interview_questions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    target_role: Mapped[str] = mapped_column(String, nullable=False)
    category: Mapped[str] = mapped_column(String, nullable=False)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    difficulty: Mapped[str] = mapped_column(String, nullable=True)
    answer_guidance: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class InterviewAttempt(Base):
    __tablename__ = "interview_attempts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    question_id: Mapped[str] = mapped_column(String, nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=True)
    ai_feedback: Mapped[dict] = mapped_column(JSON, nullable=True)
    score: Mapped[float] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
