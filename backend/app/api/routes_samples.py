from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db import model
from app.schema.sample import SampleCreate, SampleRead, SampleUpdateStatus
from datetime import datetime

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
    Generate next available sample code in format: NBS-YYYY-###
    """
    current_year = datetime.now().year

    # Find the highest sample code for current year
    prefix = f"NBS-{current_year}-"
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

@router.patch("/{sample_id}/status", response_model=SampleRead)
def update_status(sample_id: int, payload: SampleUpdateStatus, db: Session = Depends(get_db)):
    s = db.get(model.Sample, sample_id)
    if not s:
        raise HTTPException(404, "sample not found")
    s.status = payload.status
    db.commit(); db.refresh(s)
    return s

@router.delete("/{sample_id}")
def delete_sample(sample_id: int, db: Session = Depends(get_db)):
    s = db.get(model.Sample, sample_id)
    if not s:
        raise HTTPException(404, "sample not found")
    db.delete(s); db.commit()
    return {"message": "Sample deleted successfully"}
