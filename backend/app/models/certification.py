import uuid
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class Certification(Base):
    __tablename__ = "certifications"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    resume_analysis_id: Mapped[str] = mapped_column(String, nullable=True)
    name: Mapped[str] = mapped_column(String, nullable=True)
    issuer: Mapped[str] = mapped_column(String, nullable=True)
    date: Mapped[str] = mapped_column(String, nullable=True)
