from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, DateTime, Enum, JSON, ForeignKey
from datetime import datetime
import enum

from app.db.base import Base

class SampleStatus(str, enum.Enum):
    received = "received"
    processing = "processing"
    completed = "completed"
    rejected = "rejected"

class ReportStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"

class ReportFileType(str, enum.Enum):
    AA = "AA"
    AC = "AC"
    AC_EXT = "AC_EXT"

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

class Report(Base):
    __tablename__ = "reports"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sample_id: Mapped[int] = mapped_column(Integer, ForeignKey("samples.id"), nullable=False, index=True)
    upload_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    uploaded_by: Mapped[str] = mapped_column(String(128), default="anonymous")
    num_patients: Mapped[int] = mapped_column(Integer)
    processing_status: Mapped[ReportStatus] = mapped_column(Enum(ReportStatus), default=ReportStatus.pending)
    error_message: Mapped[str] = mapped_column(String(2048), default="")
    output_directory: Mapped[str] = mapped_column(String(512), default="")
    date_code: Mapped[str] = mapped_column(String(16), default="")  # DDMMYYYY from filename

    # Relationships
    sample: Mapped["Sample"] = relationship("Sample", backref="reports")
    files: Mapped[list["ReportFile"]] = relationship("ReportFile", back_populates="report", cascade="all, delete-orphan")

class ReportFile(Base):
    __tablename__ = "report_files"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    report_id: Mapped[int] = mapped_column(Integer, ForeignKey("reports.id"), nullable=False, index=True)
    filename: Mapped[str] = mapped_column(String(256))
    file_type: Mapped[ReportFileType] = mapped_column(Enum(ReportFileType))
    file_path: Mapped[str] = mapped_column(String(512))
    file_size: Mapped[int] = mapped_column(Integer)

    # Relationships
    report: Mapped["Report"] = relationship("Report", back_populates="files")
