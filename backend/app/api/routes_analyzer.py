"""
API routes for Neonatal Report Analyzer
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Body, BackgroundTasks
from fastapi.responses import JSONResponse, FileResponse
import tempfile
import shutil
from pathlib import Path
from typing import List

from app.services.neonatal_analyzer import (
    NeonatalReportAnalyzer,
    extract_zip_file,
    process_batch_pdfs
)
from app.services.report_export import generate_excel_export, generate_html_export
from app.schema.analyzer import (
    SingleAnalysisResponse,
    BatchAnalysisResponse,
    AnalysisResult,
    PatientInfo,
    BiochemicalParam,
    TestResult,
    TestRatio,
    Abnormality,
    AnalysisSummary,
    FailedReport
)

router = APIRouter(prefix="/api/analyzer", tags=["analyzer"])

# Constants for validation
MAX_PDF_SIZE_MB = 50
MAX_ZIP_SIZE_MB = 200
ALLOWED_PDF_MIME_TYPES = ['application/pdf']
ALLOWED_ZIP_MIME_TYPES = ['application/zip', 'application/x-zip-compressed']


def cleanup_temp_file(file_path: Path):
    """
    Background task to clean up temporary files after response is sent.

    Args:
        file_path: Path to the file or directory to remove
    """
    try:
        if file_path.exists():
            if file_path.is_file():
                file_path.unlink()
            elif file_path.is_dir():
                shutil.rmtree(file_path, ignore_errors=True)
    except Exception as e:
        # Log error but don't raise - cleanup failure shouldn't affect response
        print(f"Warning: Failed to cleanup temp file {file_path}: {e}")


def validate_file_upload(file: UploadFile, max_size_mb: int, allowed_types: List[str], file_extension: str):
    """
    Validate uploaded file for type and size.

    Args:
        file: Uploaded file
        max_size_mb: Maximum file size in MB
        allowed_types: List of allowed MIME types
        file_extension: Required file extension (e.g., '.pdf', '.zip')

    Raises:
        HTTPException: If validation fails
    """
    # Validate filename exists
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No filename provided"
        )

    # Validate file extension
    if not file.filename.lower().endswith(file_extension):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Only {file_extension.upper()} files are accepted."
        )

    # Validate content type if provided (allow application/octet-stream as fallback)
    if file.content_type and file.content_type not in allowed_types and file.content_type != 'application/octet-stream':
        raise HTTPException(
            status_code=400,
            detail=f"Invalid content type: {file.content_type}. Expected: {', '.join(allowed_types)}"
        )


def validate_file_size(content: bytes, max_size_mb: int, filename: str):
    """
    Validate file size.

    Args:
        content: File content bytes
        max_size_mb: Maximum allowed size in MB
        filename: Name of the file

    Raises:
        HTTPException: If file is too large
    """
    size_mb = len(content) / (1024 * 1024)
    if size_mb > max_size_mb:
        raise HTTPException(
            status_code=413,
            detail=f"File '{filename}' is too large ({size_mb:.2f}MB). Maximum size is {max_size_mb}MB."
        )

    # Check for empty file
    if len(content) == 0:
        raise HTTPException(
            status_code=400,
            detail=f"File '{filename}' is empty"
        )


def handle_analysis_error(e: Exception, filename: str = "unknown") -> SingleAnalysisResponse:
    """
    Standardized error response handler for analysis operations.

    Args:
        e: The exception that occurred
        filename: Name of the file being processed

    Returns:
        SingleAnalysisResponse with error details
    """
    import traceback

    # Determine error type and create appropriate message
    if isinstance(e, HTTPException):
        error_message = e.detail
        status_code = e.status_code
    elif isinstance(e, FileNotFoundError):
        error_message = f"File not found: {str(e)}"
        status_code = 404
    elif isinstance(e, ValueError):
        error_message = f"Invalid data in file: {str(e)}"
        status_code = 422
    elif isinstance(e, RuntimeError):
        error_message = str(e)
        status_code = 422
    else:
        # Log unexpected errors for debugging
        print(f"Unexpected error analyzing {filename}: {traceback.format_exc()}")
        error_message = "An unexpected error occurred while processing the file."
        status_code = 500

    return SingleAnalysisResponse(
        success=False,
        message=f"Failed to analyze {filename}",
        error=error_message,
        result=None
    )


def convert_analyzer_to_schema(analyzer: NeonatalReportAnalyzer) -> AnalysisResult:
    """Convert NeonatalReportAnalyzer object to AnalysisResult schema."""
    return AnalysisResult(
        file_name=analyzer.relative_path,
        patient_info=PatientInfo(**analyzer.patient_info),
        biochemical_params=[BiochemicalParam(**p) for p in analyzer.biochemical_params],
        amino_acids=[TestResult(**a) for a in analyzer.amino_acids],
        amino_acid_ratios=[TestRatio(**r) for r in analyzer.amino_acid_ratios],
        acylcarnitines=[TestResult(**a) for a in analyzer.acylcarnitines],
        acylcarnitine_ratios=[TestRatio(**r) for r in analyzer.acylcarnitine_ratios],
        abnormalities=[Abnormality(**a) for a in analyzer.abnormalities],
        summary=AnalysisSummary(**analyzer.get_summary())
    )


@router.post("/analyze-pdf", response_model=SingleAnalysisResponse)
async def analyze_single_pdf(file: UploadFile = File(...)):
    """
    Analyze a single neonatal screening PDF report.

    Args:
        file: PDF file upload

    Returns:
        Analysis result with patient info, test results, and abnormalities
    """
    # Validate file type and extension
    validate_file_upload(file, MAX_PDF_SIZE_MB, ALLOWED_PDF_MIME_TYPES, '.pdf')

    temp_path = None

    try:
        # Read and validate file content
        content = await file.read()
        validate_file_size(content, MAX_PDF_SIZE_MB, file.filename)

        # Create temporary file to store uploaded PDF
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            temp_file.write(content)
            temp_file.flush()
            temp_path = temp_file.name

        # Create analyzer and process PDF
        analyzer = NeonatalReportAnalyzer(temp_path, file.filename)

        # Extract text with validation
        extracted_text = analyzer.extract_text_from_pdf(quiet=True)

        # Validate that text was extracted
        if not extracted_text or len(extracted_text.strip()) < 100:
            raise HTTPException(
                status_code=422,
                detail="Unable to extract sufficient text from PDF. The file may be corrupted, empty, or image-based."
            )

        # Parse all sections
        analyzer.parse_patient_info()
        analyzer.parse_biochemical_parameters()
        analyzer.parse_amino_acids()
        analyzer.parse_amino_acid_ratios()
        analyzer.parse_acylcarnitines()
        analyzer.parse_acylcarnitine_ratios()

        # Validate values
        analyzer.validate_all_values()

        # Validate we have some data
        if (not analyzer.amino_acids and not analyzer.acylcarnitines):
            raise HTTPException(
                status_code=422,
                detail="No valid test results found in PDF. Please ensure this is a valid neonatal screening report."
            )

        # Convert to schema
        result = convert_analyzer_to_schema(analyzer)

        return SingleAnalysisResponse(
            success=True,
            message=f"Successfully analyzed {file.filename}",
            result=result
        )

    except HTTPException as e:
        # Convert HTTPException to standardized response
        return handle_analysis_error(e, file.filename)

    except Exception as e:
        # Handle all other errors with standardized response
        return handle_analysis_error(e, file.filename)

    finally:
        # Clean up temporary file
        if temp_path and Path(temp_path).exists():
            try:
                Path(temp_path).unlink()
            except Exception:
                pass  # Ignore cleanup errors


@router.post("/analyze-batch", response_model=BatchAnalysisResponse)
async def analyze_batch_pdfs(file: UploadFile = File(...)):
    """
    Analyze multiple neonatal screening PDF reports from a ZIP file.

    Args:
        file: ZIP file containing PDF reports

    Returns:
        Batch analysis results with summary statistics
    """
    # Validate file type and extension
    validate_file_upload(file, MAX_ZIP_SIZE_MB, ALLOWED_ZIP_MIME_TYPES, '.zip')

    temp_zip_path = None
    temp_dir = None

    try:
        # Read and validate file content
        content = await file.read()
        validate_file_size(content, MAX_ZIP_SIZE_MB, file.filename)

        # Create temporary file to store uploaded ZIP
        with tempfile.NamedTemporaryFile(delete=False, suffix='.zip') as temp_zip:
            temp_zip.write(content)
            temp_zip.flush()
            temp_zip_path = temp_zip.name

        # Extract ZIP and get PDF files
        try:
            temp_dir, pdf_files = extract_zip_file(Path(temp_zip_path))
        except Exception as e:
            raise HTTPException(
                status_code=422,
                detail=f"Failed to extract ZIP file. The file may be corrupted or password-protected: {str(e)}"
            )

        # Validate ZIP content
        if not pdf_files:
            raise HTTPException(
                status_code=422,
                detail="No PDF files found in ZIP archive. Please ensure the ZIP contains PDF files."
            )

        # Limit number of files to prevent resource exhaustion
        MAX_FILES_PER_BATCH = 100
        if len(pdf_files) > MAX_FILES_PER_BATCH:
            raise HTTPException(
                status_code=422,
                detail=f"Too many files in ZIP ({len(pdf_files)}). Maximum allowed is {MAX_FILES_PER_BATCH} files per batch."
            )

        # Process all PDFs
        results = process_batch_pdfs(pdf_files)

        # Convert results to schemas
        normal_reports = [
            convert_analyzer_from_dict(r)
            for r in results['normal_reports']
        ]

        abnormal_reports = [
            convert_analyzer_from_dict(r)
            for r in results['abnormal_reports']
        ]

        failed_reports = [
            FailedReport(**f) for f in results['failed_reports']
        ]

        # Check if all files failed
        if results['successful'] == 0 and results['failed'] > 0:
            return BatchAnalysisResponse(
                success=False,
                message=f"Batch analysis failed: All {results['total']} file(s) failed to process. See failed_reports for details.",
                total=results['total'],
                successful=0,
                failed=results['failed'],
                normal=0,
                abnormal=0,
                normal_reports=[],
                abnormal_reports=[],
                failed_reports=failed_reports
            )

        return BatchAnalysisResponse(
            success=True,
            message=f"Batch analysis complete: {results['successful']}/{results['total']} processed successfully",
            total=results['total'],
            successful=results['successful'],
            failed=results['failed'],
            normal=results['normal'],
            abnormal=results['abnormal'],
            normal_reports=normal_reports,
            abnormal_reports=abnormal_reports,
            failed_reports=failed_reports
        )

    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise

    except ValueError as e:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid ZIP file format: {str(e)}"
        )

    except RuntimeError as e:
        raise HTTPException(
            status_code=422,
            detail=f"Error processing ZIP file: {str(e)}"
        )

    except Exception as e:
        # Log unexpected errors for debugging
        import traceback
        print(f"Unexpected error in batch processing: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred while processing the batch. Please ensure the ZIP file is valid."
        )

    finally:
        # Clean up temporary files
        if temp_zip_path and Path(temp_zip_path).exists():
            try:
                Path(temp_zip_path).unlink()
            except Exception:
                pass  # Ignore cleanup errors

        if temp_dir and temp_dir.exists():
            try:
                shutil.rmtree(temp_dir, ignore_errors=True)
            except Exception:
                pass  # Ignore cleanup errors


def convert_analyzer_from_dict(data: dict) -> AnalysisResult:
    """Convert dictionary from batch processing to AnalysisResult schema."""
    return AnalysisResult(
        file_name=data['file_name'],
        patient_info=PatientInfo(**data['patient_info']),
        biochemical_params=[BiochemicalParam(**p) for p in data['biochemical_params']],
        amino_acids=[TestResult(**a) for a in data['amino_acids']],
        amino_acid_ratios=[TestRatio(**r) for r in data['amino_acid_ratios']],
        acylcarnitines=[TestResult(**a) for a in data['acylcarnitines']],
        acylcarnitine_ratios=[TestRatio(**r) for r in data['acylcarnitine_ratios']],
        abnormalities=[Abnormality(**a) for a in data['abnormalities']],
        summary=AnalysisSummary(**data['summary'])
    )


@router.post("/export/excel")
async def export_to_excel(background_tasks: BackgroundTasks, analysis_result: dict = Body(...)):
    """
    Export analysis result to Excel file.

    Args:
        analysis_result: Analysis result dictionary

    Returns:
        Excel file download
    """
    try:
        # Validate required fields
        if not analysis_result:
            raise HTTPException(
                status_code=400,
                detail="Analysis result data is required"
            )

        required_fields = ['file_name', 'patient_info', 'summary']
        missing_fields = [field for field in required_fields if field not in analysis_result]
        if missing_fields:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required fields: {', '.join(missing_fields)}"
            )

        # Create temporary directory for export
        temp_dir = Path(tempfile.mkdtemp(prefix="export_"))
        file_name = analysis_result.get('file_name', 'report').replace('.pdf', '')

        # Sanitize filename to prevent path traversal
        file_name = "".join(c for c in file_name if c.isalnum() or c in (' ', '-', '_')).strip()
        if not file_name:
            file_name = 'report'

        excel_path = temp_dir / f"{file_name}_analysis.xlsx"

        # Generate Excel file
        generate_excel_export(analysis_result, excel_path)

        # Verify file was created
        if not excel_path.exists():
            raise HTTPException(
                status_code=500,
                detail="Failed to generate Excel file"
            )

        # Schedule cleanup of temp directory after response is sent
        background_tasks.add_task(cleanup_temp_file, temp_dir)

        # Return file for download
        return FileResponse(
            path=str(excel_path),
            filename=f"{file_name}_analysis.xlsx",
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )

    except HTTPException:
        raise

    except Exception as e:
        import traceback
        print(f"Error generating Excel export: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Error generating Excel export: {str(e)}"
        )


@router.post("/export/html")
async def export_to_html(background_tasks: BackgroundTasks, analysis_result: dict = Body(...)):
    """
    Export analysis result to HTML file.

    Args:
        analysis_result: Analysis result dictionary

    Returns:
        HTML file download
    """
    try:
        # Validate required fields
        if not analysis_result:
            raise HTTPException(
                status_code=400,
                detail="Analysis result data is required"
            )

        required_fields = ['file_name', 'patient_info', 'summary']
        missing_fields = [field for field in required_fields if field not in analysis_result]
        if missing_fields:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required fields: {', '.join(missing_fields)}"
            )

        # Generate HTML content
        html_content = generate_html_export(analysis_result)

        # Validate generated content
        if not html_content or len(html_content.strip()) < 100:
            raise HTTPException(
                status_code=500,
                detail="Failed to generate HTML content"
            )

        # Create temporary file
        temp_dir = Path(tempfile.mkdtemp(prefix="export_"))
        file_name = analysis_result.get('file_name', 'report').replace('.pdf', '')

        # Sanitize filename to prevent path traversal
        file_name = "".join(c for c in file_name if c.isalnum() or c in (' ', '-', '_')).strip()
        if not file_name:
            file_name = 'report'

        html_path = temp_dir / f"{file_name}_analysis.html"

        # Write HTML to file
        html_path.write_text(html_content, encoding='utf-8')

        # Verify file was created
        if not html_path.exists():
            raise HTTPException(
                status_code=500,
                detail="Failed to generate HTML file"
            )

        # Schedule cleanup of temp directory after response is sent
        background_tasks.add_task(cleanup_temp_file, temp_dir)

        # Return file for download
        return FileResponse(
            path=str(html_path),
            filename=f"{file_name}_analysis.html",
            media_type="text/html"
        )

    except HTTPException:
        raise

    except Exception as e:
        import traceback
        print(f"Error generating HTML export: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Error generating HTML export: {str(e)}"
        )


@router.get("/health")
def health_check():
    """Health check endpoint for analyzer service."""
    return {"status": "ok", "service": "neonatal_analyzer"}
