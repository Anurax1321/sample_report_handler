from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Integer, DateTime, Enum, JSON
from datetime import datetime
import enum

from app.db.base import Base

class SampleStatus(str, enum.Enum):
    received = "received"
    processing = "processing"
    completed = "completed"
    rejected = "rejected"

class Sample(Base):
    __tablename__ = "samples"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sample_code: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    test_type: Mapped[str] = mapped_column(String(128))
    collected_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    collected_by: Mapped[str] = mapped_column(String(128))
    priority: Mapped[str] = mapped_column(String(16), default="normal")  # low|normal|high
    status: Mapped[SampleStatus] = mapped_column(Enum(SampleStatus), default=SampleStatus.received)
    notes: Mapped[str] = mapped_column(String(1024), default="")
    sample_metadata: Mapped[dict] = mapped_column(JSON, default={})
