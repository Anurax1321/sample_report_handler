# Main report processing orchestrator
# Coordinates data extraction, structuring, and Excel generation

import os
from typing import List
from app.services import data_extraction, structure, excel_generation

class ReportProcessingError(Exception):
    """Custom exception for report processing errors"""
    pass

def process_report_files(
    file_paths: List[str],
    num_patients: int = None,
    template_path: str = None,
    output_dir: str = None
) -> str:
    """
    Main processing pipeline for NBS report files

    Args:
        file_paths: List of 3 file paths [AA, AC, AC_EXT files]
        num_patients: Number of patients (excluding 4 controls). If None, auto-detect from files.
        template_path: Path to Excel template file
        output_dir: Directory where output files should be saved

    Returns:
        Path to the generated final_results.xlsx file

    Raises:
        ReportProcessingError: If processing fails at any stage
    """
    try:
        # Extract date code from first filename
        date_code = os.path.basename(file_paths[0]).split("_")[0].strip()

        # Validate all files have same date
        for file_path in file_paths[1:]:
            file_date = os.path.basename(file_path).split("_")[0].strip()
            if date_code != file_date:
                raise ReportProcessingError(
                    f"Date mismatch: {date_code} vs {file_date}. All files must have the same date."
                )

        # Data extraction phase - auto-detect patient count and validate consistency
        data = []
        names = None
        patient_counts = []

        # Extract data from all 3 files and track patient counts
        for i, file_path in enumerate(file_paths):
            df, patient_names, patient_count = data_extraction.extraction(file_path, None)
            data.append(df)
            names = patient_names  # Same names for all files
            patient_counts.append(patient_count)

            file_type = os.path.basename(file_path).split("_")[-1].replace(".txt", "")
            print(f"{file_type} file: Found {patient_count} patients/samples")

        # Validate all files have the same patient count
        if len(set(patient_counts)) > 1:
            file_types = ["AA", "AC", "AC_EXT"]
            count_details = ", ".join([f"{file_types[i]}: {patient_counts[i]}" for i in range(3)])
            raise ReportProcessingError(
                f"Patient count mismatch across files. {count_details}. "
                f"All three files must contain data for the same number of patients."
            )

        print(f"✓ Patient count validation passed: All files contain {patient_counts[0]} patients/samples")

        # Combine all data into final DataFrame
        final_data_frame = data_extraction.get_final_data(data[0], data[1], data[2], names)

        print(f"Final Data Frame Created - {final_data_frame.shape[0]} Rows X {final_data_frame.shape[1]} Columns")

        # Restructure data frames for controls and patients
        final_data_frame = [
            structure.redefine_dataframe(final_data_frame[:2].copy(), c1_flag=True),
            structure.redefine_dataframe(final_data_frame[2:4].copy(), c2_flag=True),
            structure.redefine_dataframe(final_data_frame[4:].copy())
        ]

        # Generate Excel files
        output_path = os.path.join(output_dir, date_code, 'final_results.xlsx')
        excel_path = excel_generation.write_to_excel(
            final_data_frame,
            output_path,
            date_code,
            template_path
        )

        print(f"Report processing completed successfully: {excel_path}")
        return excel_path

    except (data_extraction.DataExtractionError, structure.StructureError,
            excel_generation.ExcelGenerationError) as e:
        raise ReportProcessingError(f"Processing failed: {str(e)}")
    except Exception as e:
        raise ReportProcessingError(f"Unexpected error during processing: {str(e)}")
