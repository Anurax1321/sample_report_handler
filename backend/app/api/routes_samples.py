from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db import models
from app.schemas.sample import SampleCreate, SampleRead, SampleUpdateStatus

router = APIRouter(prefix="/samples", tags=["samples"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=SampleRead)
def create_sample(payload: SampleCreate, db: Session = Depends(get_db)):
    if db.query(models.Sample).filter_by(sample_code=payload.sample_code).first():
        raise HTTPException(400, "sample_code already exists")
    sample = models.Sample(
        sample_code=payload.sample_code,
        test_type=payload.test_type,
        collected_at=payload.collected_at,
        collected_by=payload.collected_by,
        priority=payload.priority,
        notes=payload.notes,
        metadata=payload.metadata,
    )
    db.add(sample); db.commit(); db.refresh(sample)
    return sample

@router.get("/", response_model=list[SampleRead])
def list_samples(db: Session = Depends(get_db), status: str | None = None):
    q = db.query(models.Sample)
    if status:
        q = q.filter(models.Sample.status == status)
    return q.order_by(models.Sample.id.desc()).all()

@router.patch("/{sample_id}/status", response_model=SampleRead)
def update_status(sample_id: int, payload: SampleUpdateStatus, db: Session = Depends(get_db)):
    s = db.get(models.Sample, sample_id)
    if not s:
        raise HTTPException(404, "sample not found")
    s.status = payload.status
    db.commit(); db.refresh(s)
    return s

@router.delete("/{sample_id}")
def delete_sample(sample_id: int, db: Session = Depends(get_db)):
    s = db.get(models.Sample, sample_id)
    if not s:
        raise HTTPException(404, "sample not found")
    db.delete(s); db.commit()
    return {"ok": True}
