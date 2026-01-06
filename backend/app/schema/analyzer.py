"""
Pydantic schemas for Neonatal Report Analyzer API
"""

from pydantic import BaseModel
from typing import List, Dict, Optional


class PatientInfo(BaseModel):
    """Patient demographic information from report."""
    name: Optional[str] = None
    age_gender: Optional[str] = None
    uhid: Optional[str] = None
    referred_by: Optional[str] = None
    collected_on: Optional[str] = None
    received_on: Optional[str] = None
    reported_on: Optional[str] = None


class BiochemicalParam(BaseModel):
    """Biochemical parameter result."""
    parameter: str
    result: str
    method: str


class TestResult(BaseModel):
    """Individual test result with validation."""
    analyte: str
    value: float
    reference_range: str
    unit: str
    is_normal: Optional[bool] = None
    validation_reason: Optional[str] = None


class TestRatio(BaseModel):
    """Test ratio result with validation."""
    ratio: str
    value: float
    reference_range: str
    is_normal: Optional[bool] = None
    validation_reason: Optional[str] = None


class Abnormality(BaseModel):
    """Abnormal test result details."""
    category: str
    analyte: str
    value: float
    reference_range: str
    reason: str
    unit: str


class AnalysisSummary(BaseModel):
    """Summary statistics of analysis."""
    total_tests: int
    normal_count: int
    abnormal_count: int
    status: str  # 'normal' or 'abnormal'


class AnalysisResult(BaseModel):
    """Complete analysis result for a single PDF."""
    file_name: str
    patient_info: PatientInfo
    biochemical_params: List[BiochemicalParam]
    amino_acids: List[TestResult]
    amino_acid_ratios: List[TestRatio]
    acylcarnitines: List[TestResult]
    acylcarnitine_ratios: List[TestRatio]
    abnormalities: List[Abnormality]
    summary: AnalysisSummary


class SingleAnalysisResponse(BaseModel):
    """API response for single PDF analysis."""
    success: bool
    message: str
    result: Optional[AnalysisResult] = None
    error: Optional[str] = None


class FailedReport(BaseModel):
    """Failed report processing details."""
    path: str
    error: str


class BatchAnalysisResponse(BaseModel):
    """API response for batch PDF analysis."""
    success: bool
    message: str
    total: int
    successful: int
    failed: int
    normal: int
    abnormal: int
    normal_reports: List[AnalysisResult]
    abnormal_reports: List[AnalysisResult]
    failed_reports: List[FailedReport]
