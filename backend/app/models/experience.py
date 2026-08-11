import uuid
from sqlalchemy import String, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class Experience(Base):
    __tablename__ = "experience"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    resume_analysis_id: Mapped[str] = mapped_column(String, nullable=True)
    company: Mapped[str] = mapped_column(String, nullable=True)
    role: Mapped[str] = mapped_column(String, nullable=True)
    start_date: Mapped[str] = mapped_column(String, nullable=True)
    end_date: Mapped[str] = mapped_column(String, nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    technologies: Mapped[list] = mapped_column(JSON, nullable=True)
