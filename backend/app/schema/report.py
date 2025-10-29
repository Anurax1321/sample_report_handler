from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime

class ReportFileRead(BaseModel):
    id: int
    filename: str
    file_type: Literal["AA", "AC", "AC_EXT"]
    file_size: int

    class Config:
        from_attributes = True

class ReportCreate(BaseModel):
    sample_id: int = Field(gt=0, description="ID of the sample this report belongs to")
    num_patients: int = Field(ge=1, description="Number of patients to process (excluding controls)")
    uploaded_by: str = "anonymous"

class ReportRead(BaseModel):
    id: int
    sample_id: int
    upload_date: datetime
    uploaded_by: str
    num_patients: int
    processing_status: Literal["pending", "processing", "completed", "failed"]
    error_message: str
    output_directory: str
    date_code: str
    files: list[ReportFileRead] = []

    class Config:
        from_attributes = True

class ReportUpdateStatus(BaseModel):
    processing_status: Literal["pending", "processing", "completed", "failed"]
    error_message: Optional[str] = None
