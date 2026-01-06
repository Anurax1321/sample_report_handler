from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db import model
from app.schema.report import ReportCreate, ReportRead
from app.services import file_validator, report_processor, pdf_generation, excel_export
from typing import List
import os
import shutil
import zipfile
from io import BytesIO
import json

router = APIRouter(prefix="/reports", tags=["reports"])

# Configuration - use absolute paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # Project backend dir
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
TEMPLATE_PATH = os.path.join(BASE_DIR, "templates", "template.xlsx")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/upload", response_model=ReportRead)
async def upload_report(
    uploaded_by: str = Form("anonymous"),
    file1: UploadFile = File(...),
    file2: UploadFile = File(...),
    file3: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload 3 NBS report files and process them

    Expects:
    - file1, file2, file3: Three text files (AA, AC, AC_EXT)
    - uploaded_by: Name of person uploading (optional)

    Returns:
    - Report object with processing status
    """
    try:

        # Validate filenames
        try:
            date_code = file_validator.validate_three_files(
                file1.filename, file2.filename, file3.filename
            )
        except file_validator.FileValidationError as e:
            raise HTTPException(400, str(e))

        # Create report record (sample_id and num_patients are now nullable)
        report = model.Report(
            sample_id=None,
            num_patients=None,
            uploaded_by=uploaded_by,
            date_code=date_code,
            processing_status=model.ReportStatus.processing
        )
        db.add(report)
        db.commit()
        db.refresh(report)

        # Create upload directory for this report
        report_upload_dir = os.path.join(UPLOAD_DIR, str(report.id), "raw")
        os.makedirs(report_upload_dir, exist_ok=True)

        # Save uploaded files
        file_paths = []
        uploaded_files = [
            (file1, "AA"),
            (file2, "AC"),
            (file3, "AC_EXT")
        ]

        for upload_file, file_type in uploaded_files:
            # Validate file size
            upload_file.file.seek(0, 2)  # Seek to end
            file_size = upload_file.file.tell()
            upload_file.file.seek(0)  # Reset to beginning

            try:
                file_validator.validate_file_size(file_size)
            except file_validator.FileValidationError as e:
                raise HTTPException(400, str(e))

            # Save file
            file_path = os.path.join(report_upload_dir, upload_file.filename)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(upload_file.file, buffer)

            file_paths.append(file_path)

            # Create ReportFile record
            report_file = model.ReportFile(
                report_id=report.id,
                filename=upload_file.filename,
                file_type=model.ReportFileType[file_type],
                file_path=file_path,
                file_size=file_size
            )
            db.add(report_file)

        db.commit()

        # Process files (num_patients will be auto-detected)
        try:
            output_dir = os.path.join(UPLOAD_DIR, str(report.id), "output")
            excel_path, processed_data_json = report_processor.process_report_files(
                file_paths,
                None,  # Auto-detect patient count from files
                TEMPLATE_PATH,
                output_dir
            )

            # Update report status and store processed data
            report.processing_status = model.ReportStatus.completed
            report.output_directory = os.path.dirname(excel_path)
            report.processed_data = processed_data_json
            db.commit()
            db.refresh(report)

        except report_processor.ReportProcessingError as e:
            # Mark as failed
            report.processing_status = model.ReportStatus.failed
            report.error_message = str(e)
            db.commit()
            db.refresh(report)
            import traceback
            print(f"ERROR: {str(e)}")
            print(f"TRACEBACK: {traceback.format_exc()}")
            raise HTTPException(500, f"Processing failed: {str(e)}")

        return report

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Unexpected error: {str(e)}")

@router.get("/", response_model=list[ReportRead])
def list_reports(db: Session = Depends(get_db), sample_id: int | None = None):
    """
    List all reports, optionally filtered by sample_id

    Query params:
    - sample_id: Filter by sample ID (optional)
    """
    q = db.query(model.Report)
    if sample_id:
        q = q.filter(model.Report.sample_id == sample_id)
    return q.order_by(model.Report.id.desc()).all()

@router.get("/{report_id}", response_model=ReportRead)
def get_report(report_id: int, db: Session = Depends(get_db)):
    """Get a specific report by ID"""
    report = db.get(model.Report, report_id)
    if not report:
        raise HTTPException(404, "Report not found")
    return report

@router.get("/{report_id}/processed-data")
def get_processed_data(report_id: int, db: Session = Depends(get_db)):
    """
    Get processed data for a report in JSON format

    This endpoint returns the processed report data with:
    - Sample names and patient information
    - All compound values with color coding (green/yellow/red)
    - Reference ranges for validation
    - Structured dataframes ready for frontend display

    Returns:
    - JSON object with processed data
    """
    report = db.get(model.Report, report_id)
    if not report:
        raise HTTPException(404, "Report not found")

    if report.processing_status != model.ReportStatus.completed:
        raise HTTPException(400, f"Report is not ready. Status: {report.processing_status}")

    if not report.processed_data:
        raise HTTPException(404, "Processed data not found for this report")

    # Return the JSON data (it's already a JSON string in the database)
    import json
    return json.loads(report.processed_data)

@router.get("/{report_id}/download")
async def download_report(report_id: int, db: Session = Depends(get_db)):
    """
    Download all generated Excel files for a report as a ZIP file

    Returns:
    - ZIP file containing all generated Excel files
    """
    report = db.get(model.Report, report_id)
    if not report:
        raise HTTPException(404, "Report not found")

    if report.processing_status != model.ReportStatus.completed:
        raise HTTPException(400, f"Report is not ready for download. Status: {report.processing_status}")

    if not report.output_directory or not os.path.exists(report.output_directory):
        raise HTTPException(404, "Output files not found")

    # Create ZIP file in memory
    zip_buffer = BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        # Add all Excel files from output directory
        for filename in os.listdir(report.output_directory):
            if filename.endswith('.xlsx'):
                file_path = os.path.join(report.output_directory, filename)
                zip_file.write(file_path, arcname=filename)

    zip_buffer.seek(0)

    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=report_{report_id}_{report.date_code}.zip"}
    )

@router.post("/{report_id}/approve")
async def approve_report(report_id: int, edited_data: dict, db: Session = Depends(get_db)):
    """
    Approve a report with edited data and generate PDF

    Body:
    - edited_data: Dictionary containing the edited cell values from the frontend

    Returns:
    - Report object with pdf_path field containing the path to generated PDF
    """
    report = db.get(model.Report, report_id)
    if not report:
        raise HTTPException(404, "Report not found")

    if report.processing_status != model.ReportStatus.completed:
        raise HTTPException(400, f"Report is not ready for approval. Status: {report.processing_status}")

    try:
        # Store the edited data in the processed_data field
        processed_data = json.loads(report.processed_data)

        # Update processed_data with edited values
        # edited_data format: { "rowId-compound": newValue, ... }
        for cell_key, new_value in edited_data.items():
            row_id_str, compound = cell_key.split('-', 1)
            row_id = int(row_id_str)

            if row_id < len(processed_data['processed_data']):
                if compound in processed_data['processed_data'][row_id]['values']:
                    processed_data['processed_data'][row_id]['values'][compound]['value'] = new_value

        # Save updated processed data
        report.processed_data = json.dumps(processed_data)

        # Generate PDFs with updated data (one per patient)
        date_code = processed_data['date_code']
        output_dir = os.path.join(UPLOAD_DIR, str(report_id), "output", date_code)

        pdf_paths = pdf_generation.generate_nbs_report_pdf(
            processed_data,
            output_dir,
            date_code
        )

        # Create a ZIP file containing all PDFs
        zip_filename = f"NBS_Reports_{date_code}.zip"
        zip_path = os.path.join(output_dir, zip_filename)

        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for pdf_path in pdf_paths:
                zip_file.write(pdf_path, arcname=os.path.basename(pdf_path))

        # Update report with output directory
        report.output_directory = output_dir

        db.commit()
        db.refresh(report)

        # Return report with zip info for frontend
        return {
            **report.__dict__,
            "pdf_count": len(pdf_paths),
            "zip_path": zip_path,
            "zip_filename": zip_filename
        }

    except pdf_generation.PDFGenerationError as e:
        raise HTTPException(500, f"PDF generation failed: {str(e)}")
    except Exception as e:
        raise HTTPException(500, f"Unexpected error during approval: {str(e)}")

@router.get("/{report_id}/download-pdf")
async def download_pdf(report_id: int, db: Session = Depends(get_db)):
    """
    Download the generated PDFs as a ZIP file

    Returns:
    - ZIP file containing all patient PDF reports
    """
    report = db.get(model.Report, report_id)
    if not report:
        raise HTTPException(404, "Report not found")

    if not report.output_directory or not os.path.exists(report.output_directory):
        raise HTTPException(404, "Output directory not found")

    # Find ZIP file in output directory
    zip_files = [f for f in os.listdir(report.output_directory) if f.endswith('.zip')]

    if not zip_files:
        raise HTTPException(404, "ZIP file not found. Please approve the report first.")

    zip_path = os.path.join(report.output_directory, zip_files[0])

    if not os.path.exists(zip_path):
        raise HTTPException(404, "ZIP file not found")

    return FileResponse(
        zip_path,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={zip_files[0]}"}
    )

@router.post("/{report_id}/download-excel")
async def download_excel(report_id: int, edited_data: dict = None, db: Session = Depends(get_db)):
    """
    Download the review grid as an Excel file with color coding and reference ranges

    Body:
    - edited_data: Optional dictionary of edited cell values {cellKey: value}

    Returns:
    - Excel file with formatted data, colors, and reference ranges
    """
    report = db.get(model.Report, report_id)
    if not report:
        raise HTTPException(404, "Report not found")

    if report.processing_status != model.ReportStatus.completed:
        raise HTTPException(400, f"Report is not ready. Status: {report.processing_status}")

    if not report.processed_data:
        raise HTTPException(404, "Processed data not found for this report")

    try:
        # Parse processed data
        processed_data = json.loads(report.processed_data)

        # Generate Excel file
        excel_buffer = excel_export.export_review_data_to_excel(processed_data, edited_data)

        # Return as downloadable file
        return StreamingResponse(
            excel_buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=report_{report_id}_{processed_data['date_code']}_review.xlsx"}
        )

    except excel_export.ExcelExportError as e:
        raise HTTPException(500, f"Excel export failed: {str(e)}")
    except Exception as e:
        raise HTTPException(500, f"Unexpected error during Excel export: {str(e)}")

@router.delete("/{report_id}")
def delete_report(report_id: int, db: Session = Depends(get_db)):
    """Delete a report and all associated files"""
    report = db.get(model.Report, report_id)
    if not report:
        raise HTTPException(404, "Report not found")

    # Delete files from filesystem
    report_dir = os.path.join(UPLOAD_DIR, str(report_id))
    if os.path.exists(report_dir):
        shutil.rmtree(report_dir)

    # Delete from database (cascade will handle report_files)
    db.delete(report)
    db.commit()

    return {"message": "Report deleted successfully"}
