from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, DateTime, Boolean, Enum, JSON, ForeignKey, Text, Table, Column
from datetime import datetime
from typing import Optional
import enum

from app.db.base import Base

# Many-to-many junction table for Report <-> Sample
report_samples = Table(
    "report_samples",
    Base.metadata,
    Column("report_id", Integer, ForeignKey("reports.id", ondelete="CASCADE"), primary_key=True),
    Column("sample_id", Integer, ForeignKey("samples.id", ondelete="CASCADE"), primary_key=True),
)

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(256))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


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

    # Core identification
    sample_code: Mapped[str] = mapped_column(String(64), unique=True, index=True)  # VRL serial number
    patient_id: Mapped[str] = mapped_column(String(256), default="")  # Sample ID (e.g., "B/O najiya 378981")

    # Audit fields
    created_by_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)

    # Sample details
    age_gender: Mapped[str] = mapped_column(String(64), default="")  # Format: "10D/F", "3D/M 2.64"
    from_hospital: Mapped[str] = mapped_column(String(256), default="")  # Hospital/clinic name
    type_of_analysis: Mapped[str] = mapped_column(String(64), default="")  # e.g., "BIO7", "BIO6"
    type_of_sample: Mapped[str] = mapped_column(String(64), default="")  # e.g., "DBS" (Dried Blood Spot)

    # Dates
    collection_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    registered_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    reported_on: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Legacy/Additional fields
    test_type: Mapped[str] = mapped_column(String(128), default="")  # Kept for backward compatibility
    collected_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    collected_by: Mapped[str] = mapped_column(String(128), default="")
    priority: Mapped[str] = mapped_column(String(16), default="normal")  # low|normal|high
    status: Mapped[SampleStatus] = mapped_column(Enum(SampleStatus), default=SampleStatus.received)
    notes: Mapped[str] = mapped_column(String(1024), default="")
    sample_metadata: Mapped[dict] = mapped_column(JSON, default=dict)

class Report(Base):
    __tablename__ = "reports"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sample_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("samples.id"), nullable=True, index=True)
    uploaded_by_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    upload_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    uploaded_by: Mapped[str] = mapped_column(String(128), default="anonymous")
    num_patients: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    processing_status: Mapped[ReportStatus] = mapped_column(Enum(ReportStatus), default=ReportStatus.pending)
    error_message: Mapped[str] = mapped_column(String(2048), default="")
    output_directory: Mapped[str] = mapped_column(String(512), default="")
    date_code: Mapped[str] = mapped_column(String(16), default="")  # DDMMYYYY from filename
    processed_data: Mapped[str] = mapped_column(Text, default="")  # JSON string of processed report data

    # Relationships
    sample: Mapped[Optional["Sample"]] = relationship("Sample", backref="reports", foreign_keys=[sample_id])
    samples: Mapped[list["Sample"]] = relationship("Sample", secondary=report_samples, backref="linked_reports")
    files: Mapped[list["ReportFile"]] = relationship("ReportFile", back_populates="report", cascade="all, delete-orphan")

class SamplePdf(Base):
    __tablename__ = "sample_pdfs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sample_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("samples.id", ondelete="CASCADE"), nullable=True, index=True)
    filename: Mapped[str] = mapped_column(String(256))
    file_path: Mapped[str] = mapped_column(String(512))
    file_size: Mapped[int] = mapped_column(Integer)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    sample: Mapped[Optional["Sample"]] = relationship("Sample", backref="pdfs", foreign_keys=[sample_id])

class ReportFile(Base):
    __tablename__ = "report_files"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    report_id: Mapped[int] = mapped_column(Integer, ForeignKey("reports.id"), nullable=False, index=True)
    filename: Mapped[str] = mapped_column(String(256))
    file_type: Mapped[str] = mapped_column(String(10))
    file_path: Mapped[str] = mapped_column(String(512))
    file_size: Mapped[int] = mapped_column(Integer)

    # Relationships
    report: Mapped["Report"] = relationship("Report", back_populates="files")


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(64))
    entity_type: Mapped[str] = mapped_column(String(64))
    entity_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    details: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
