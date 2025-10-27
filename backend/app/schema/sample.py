from pydantic import BaseModel
from typing import Optional, Literal, Dict
from datetime import datetime

class SampleCreate(BaseModel):
    sample_code: str
    test_type: str
    collected_at: Optional[datetime] = None
    collected_by: str
    priority: Literal["low", "normal", "high"] = "normal"
    notes: str = ""
    sample_metadata: Dict = {}

class SampleRead(BaseModel):
    id: int
    sample_code: str
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
