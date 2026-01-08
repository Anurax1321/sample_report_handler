from pydantic import BaseModel
from typing import Optional, Literal, Dict
from datetime import datetime

class SampleCreate(BaseModel):
    # Core identification (Excel fields)
    sample_code: str  # VRL serial number
    patient_id: str = ""  # Sample ID (e.g., "B/O najiya 378981")

    # Sample details (Excel fields)
    age_gender: str = ""  # Format: "10D/F", "3D/M 2.64"
    from_hospital: str = ""  # Hospital/clinic name
    type_of_analysis: str = ""  # e.g., "BIO7", "BIO6"
    type_of_sample: str = ""  # e.g., "DBS" (Dried Blood Spot)

    # Dates (Excel fields)
    collection_date: Optional[datetime] = None
    reported_on: Optional[datetime] = None

    # Legacy/Additional fields (kept for backward compatibility)
    test_type: str = ""
    collected_at: Optional[datetime] = None
    collected_by: str = ""
    priority: Literal["low", "normal", "high"] = "normal"
    notes: str = ""
    sample_metadata: Dict = {}

class SampleRead(BaseModel):
    id: int
    # Core identification
    sample_code: str
    patient_id: str

    # Sample details
    age_gender: str
    from_hospital: str
    type_of_analysis: str
    type_of_sample: str

    # Dates
    collection_date: datetime
    reported_on: Optional[datetime]

    # Legacy/Additional fields
    test_type: str
    collected_at: datetime
    collected_by: str
    priority: str
    status: str
    notes: str
    sample_metadata: Dict

    class Config:
        from_attributes = True

class SampleUpdateStatus(BaseModel):
    status: Literal["received","processing","completed","rejected"]
