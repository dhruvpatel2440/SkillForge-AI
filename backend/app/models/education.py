import uuid
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class Education(Base):
    __tablename__ = "education"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    resume_analysis_id: Mapped[str] = mapped_column(String, nullable=True)
    institution: Mapped[str] = mapped_column(String, nullable=True)
    degree: Mapped[str] = mapped_column(String, nullable=True)
    field: Mapped[str] = mapped_column(String, nullable=True)
    start_date: Mapped[str] = mapped_column(String, nullable=True)
    end_date: Mapped[str] = mapped_column(String, nullable=True)
