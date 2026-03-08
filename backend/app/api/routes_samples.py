from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.session import SessionLocal
from app.db import model
from app.schema.sample import SampleCreate, SampleRead, SampleUpdate, SampleUpdateStatus, SampleUpdateReportedDate, SamplePdfRead
from datetime import datetime
import uuid
import os
import shutil

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads", "sample_pdfs")

router = APIRouter(prefix="/samples", tags=["samples"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=SampleRead)
def create_sample(payload: SampleCreate, db: Session = Depends(get_db)):
    if db.query(model.Sample).filter_by(sample_code=payload.sample_code).first():
        raise HTTPException(400, "sample_code already exists")
    sample = model.Sample(
        # Core identification
        sample_code=payload.sample_code,
        patient_id=payload.patient_id,
        # Sample details
        age_gender=payload.age_gender,
        from_hospital=payload.from_hospital,
        type_of_analysis=payload.type_of_analysis,
        type_of_sample=payload.type_of_sample,
        # Dates
        collection_date=payload.collection_date or datetime.now(),
        reported_on=payload.reported_on,
        # Legacy/Additional fields
        test_type=payload.test_type,
        collected_at=payload.collected_at or datetime.now(),
        collected_by=payload.collected_by,
        priority=payload.priority,
        notes=payload.notes,
        sample_metadata=payload.sample_metadata,
    )
    db.add(sample); db.commit(); db.refresh(sample)
    return sample

@router.get("/generate-code")
def generate_sample_code(db: Session = Depends(get_db)):
    """
    Generate next available sample code in format: VRL-YYYY-###
    """
    current_year = datetime.now().year

    # Find the highest sample code for current year
    prefix = f"VRLS-{current_year}-"
    samples = db.query(model.Sample).filter(
        model.Sample.sample_code.like(f"{prefix}%")
    ).all()

    if not samples:
        next_number = 1
    else:
        # Extract numbers from existing codes and find max
        numbers = []
        for sample in samples:
            try:
                # Extract number after last dash
                num_str = sample.sample_code.split('-')[-1]
                numbers.append(int(num_str))
            except (ValueError, IndexError):
                continue

        next_number = max(numbers) + 1 if numbers else 1

    # Format with leading zeros (3 digits)
    sample_code = f"{prefix}{next_number:03d}"

    return {"sample_code": sample_code}

@router.get("/", response_model=list[SampleRead])
def list_samples(db: Session = Depends(get_db), status: str | None = None):
    q = db.query(model.Sample)
    if status:
        q = q.filter(model.Sample.status == status)
    return q.order_by(model.Sample.id.desc()).all()

@router.get("/search", response_model=list[SampleRead])
def search_samples(q: str = "", db: Session = Depends(get_db)):
    if not q.strip():
        return []
    return db.query(model.Sample).filter(
        model.Sample.patient_id.ilike(f"%{q.strip()}%")
    ).limit(10).all()

@router.patch("/{sample_id}", response_model=SampleRead)
def update_sample(sample_id: int, payload: SampleUpdate, db: Session = Depends(get_db)):
    s = db.get(model.Sample, sample_id)
    if not s:
        raise HTTPException(404, "sample not found")
    update_data = payload.model_dump(exclude_none=True)
    for field, value in update_data.items():
        if field == "sample_metadata":
            existing = s.sample_metadata or {}
            existing.update(value)
            s.sample_metadata = existing
        else:
            setattr(s, field, value)
    db.commit(); db.refresh(s)
    return s

@router.patch("/{sample_id}/status", response_model=SampleRead)
def update_status(sample_id: int, payload: SampleUpdateStatus, db: Session = Depends(get_db)):
    s = db.get(model.Sample, sample_id)
    if not s:
        raise HTTPException(404, "sample not found")

    # Automatically set reported_on when status changes to completed
    if payload.status == "completed" and s.status != "completed":
        s.reported_on = datetime.now()

    s.status = payload.status
    db.commit(); db.refresh(s)
    return s

@router.patch("/{sample_id}/reported-date", response_model=SampleRead)
def update_reported_date(sample_id: int, payload: SampleUpdateReportedDate, db: Session = Depends(get_db)):
    s = db.get(model.Sample, sample_id)
    if not s:
        raise HTTPException(404, "sample not found")
    s.reported_on = payload.reported_on
    db.commit(); db.refresh(s)
    return s

@router.post("/{sample_id}/link-report/{report_id}")
def link_report_to_sample(sample_id: int, report_id: int, db: Session = Depends(get_db)):
    s = db.get(model.Sample, sample_id)
    if not s:
        raise HTTPException(404, "sample not found")
    r = db.get(model.Report, report_id)
    if not r:
        raise HTTPException(404, "report not found")
    # Check if already linked
    existing = db.execute(
        model.report_samples.select().where(
            (model.report_samples.c.report_id == report_id) &
            (model.report_samples.c.sample_id == sample_id)
        )
    ).first()
    if existing:
        return {"message": "Already linked"}
    db.execute(model.report_samples.insert().values(report_id=report_id, sample_id=sample_id))
    db.commit()
    return {"message": "Report linked to sample"}

@router.delete("/{sample_id}")
def delete_sample(sample_id: int, db: Session = Depends(get_db)):
    s = db.get(model.Sample, sample_id)
    if not s:
        raise HTTPException(404, "sample not found")
    # Clean up associated PDF files from disk
    pdfs = db.query(model.SamplePdf).filter(model.SamplePdf.sample_id == sample_id).all()
    for pdf in pdfs:
        if os.path.exists(pdf.file_path):
            os.remove(pdf.file_path)
    db.delete(s); db.commit()
    return {"message": "Sample deleted successfully"}

# --- Sample PDF endpoints ---

@router.post("/upload-pdf", response_model=SamplePdfRead)
def upload_sample_pdf(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are allowed")

    unlinked_dir = os.path.join(UPLOAD_DIR, "unlinked")
    os.makedirs(unlinked_dir, exist_ok=True)

    # UUID prefix to avoid collisions
    safe_name = f"{uuid.uuid4().hex[:8]}_{file.filename}"
    file_path = os.path.join(unlinked_dir, safe_name)

    # Save file to disk
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    file_size = os.path.getsize(file_path)

    pdf_record = model.SamplePdf(
        sample_id=None,
        filename=file.filename,
        file_path=file_path,
        file_size=file_size,
    )
    db.add(pdf_record); db.commit(); db.refresh(pdf_record)
    return pdf_record

@router.post("/{sample_id}/link-pdf/{pdf_id}")
def link_pdf_to_sample(sample_id: int, pdf_id: int, db: Session = Depends(get_db)):
    s = db.get(model.Sample, sample_id)
    if not s:
        raise HTTPException(404, "sample not found")
    pdf = db.get(model.SamplePdf, pdf_id)
    if not pdf:
        raise HTTPException(404, "pdf not found")

    # Move file from unlinked/ to {sample_id}/
    sample_dir = os.path.join(UPLOAD_DIR, str(sample_id))
    os.makedirs(sample_dir, exist_ok=True)
    new_path = os.path.join(sample_dir, os.path.basename(pdf.file_path))
    if os.path.exists(pdf.file_path):
        shutil.move(pdf.file_path, new_path)

    pdf.sample_id = sample_id
    pdf.file_path = new_path
    db.commit()
    return {"message": "PDF linked to sample"}

@router.get("/{sample_id}/pdfs", response_model=list[SamplePdfRead])
def list_sample_pdfs(sample_id: int, db: Session = Depends(get_db)):
    s = db.get(model.Sample, sample_id)
    if not s:
        raise HTTPException(404, "sample not found")
    return db.query(model.SamplePdf).filter(model.SamplePdf.sample_id == sample_id).order_by(model.SamplePdf.id.desc()).all()

@router.get("/pdfs/unlinked", response_model=list[SamplePdfRead])
def list_unlinked_pdfs(db: Session = Depends(get_db)):
    # For duplicate filenames, only return the most recent one (highest id)
    latest_ids_subq = (
        db.query(func.max(model.SamplePdf.id).label("id"))
        .filter(model.SamplePdf.sample_id.is_(None))
        .group_by(model.SamplePdf.filename)
        .subquery()
    )
    return (
        db.query(model.SamplePdf)
        .join(latest_ids_subq, model.SamplePdf.id == latest_ids_subq.c.id)
        .order_by(model.SamplePdf.id.desc())
        .all()
    )

@router.get("/pdfs/{pdf_id}/download")
def download_sample_pdf(pdf_id: int, db: Session = Depends(get_db)):
    pdf = db.get(model.SamplePdf, pdf_id)
    if not pdf:
        raise HTTPException(404, "pdf not found")
    if not os.path.exists(pdf.file_path):
        raise HTTPException(404, "file not found on disk")
    return FileResponse(pdf.file_path, filename=pdf.filename, media_type="application/pdf")

@router.delete("/pdfs/{pdf_id}")
def delete_sample_pdf(pdf_id: int, db: Session = Depends(get_db)):
    pdf = db.get(model.SamplePdf, pdf_id)
    if not pdf:
        raise HTTPException(404, "pdf not found")
    if os.path.exists(pdf.file_path):
        os.remove(pdf.file_path)
    db.delete(pdf); db.commit()
    return {"message": "PDF deleted successfully"}
