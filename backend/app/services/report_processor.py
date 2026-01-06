# Main report processing orchestrator
# Coordinates data extraction, structuring, and Excel generation

import os
import json
from typing import List, Dict, Any, Tuple
from app.services import data_extraction, structure, excel_generation
from app.core.reference_ranges import range_dict, control_1_range_dict, control_2_range_dict, ratio_range_dict

class ReportProcessingError(Exception):
    """Custom exception for report processing errors"""
    pass

def serialize_processed_data(
    final_data_frame_list: List,
    raw_combined_df,
    patient_names: List[str],
    date_code: str
) -> str:
    """
    Serialize processed report data to JSON format for frontend review

    Args:
        final_data_frame_list: List of 3 DataFrames [Control I, Control II, Patients]
        raw_combined_df: The raw combined DataFrame before restructuring
        patient_names: List of patient/sample names
        date_code: Date code from filename

    Returns:
        JSON string containing all processed data with metadata
    """
    import pandas as pd
    import numpy as np

    # Helper to convert DataFrame to serializable dict
    def df_to_dict(df):
        # Replace NaN with None for JSON compatibility
        df_copy = df.copy()
        df_copy = df_copy.replace({np.nan: None})
        return {
            'columns': df_copy.columns.tolist(),
            'data': df_copy.values.tolist()
        }

    # Helper to determine color coding for a value
    def get_color_code(compound: str, value, is_control_1: bool = False, is_control_2: bool = False):
        """
        Determine color code based on value and reference ranges
        Returns: 'green' (normal), 'yellow' (out of range), 'red' (critical)
        """
        try:
            val = float(value)
        except (ValueError, TypeError):
            return 'none'  # Not a number

        if is_control_1:
            ranges = control_1_range_dict
        elif is_control_2:
            ranges = control_2_range_dict
        else:
            ranges = range_dict

        if compound not in ranges:
            return 'none'

        min_val, max_val = ranges[compound]

        if min_val <= val <= max_val:
            return 'green'  # Within range
        else:
            # Check if critically out of range (>50% beyond limits)
            lower_critical = min_val * 0.5
            upper_critical = max_val * 1.5
            if val < lower_critical or val > upper_critical:
                return 'red'  # Critical
            return 'yellow'  # Out of range but not critical

    # Process raw data with color coding
    compound_columns = [col for col in raw_combined_df.columns if col != 'Sample text']

    # Add ratio columns that will be calculated or manually entered
    ratio_columns = ['TotalCN', 'Met/Leu', 'Met/Phe', 'Phe/Tyr', 'Leu/Ala', 'Leu/Tyr']
    all_columns = compound_columns + ratio_columns

    # Build data array with color codes
    processed_data_with_colors = []
    for idx, row in raw_combined_df.iterrows():
        row_data = {
            'sample_name': row['Sample text'],
            'is_control_1': idx in [0, 1],
            'is_control_2': idx in [2, 3],
            'is_patient': idx >= 4,
            'values': {}
        }

        # Process existing compound values
        for compound in compound_columns:
            value = row[compound]
            color = get_color_code(
                compound,
                value,
                is_control_1=row_data['is_control_1'],
                is_control_2=row_data['is_control_2']
            )
            row_data['values'][compound] = {
                'value': value if pd.notna(value) else None,
                'color': color
            }

        # Add ratio columns with blank/null values (to be filled by user or calculated later)
        for ratio in ratio_columns:
            row_data['values'][ratio] = {
                'value': None,  # Start as blank
                'color': 'none'
            }

        processed_data_with_colors.append(row_data)

    # Build final JSON structure
    result = {
        'date_code': date_code,
        'patient_count': len(patient_names),
        'patient_names': patient_names,
        'compounds': all_columns,  # Include both compounds and ratios
        'reference_ranges': {
            'patient': range_dict,
            'control_1': control_1_range_dict,
            'control_2': control_2_range_dict,
            'ratios': ratio_range_dict  # Add ratio ranges
        },
        'processed_data': processed_data_with_colors,
        'structured_dataframes': {
            'control_1': df_to_dict(final_data_frame_list[0]),
            'control_2': df_to_dict(final_data_frame_list[1]),
            'patients': df_to_dict(final_data_frame_list[2])
        }
    }

    return json.dumps(result)

def process_report_files(
    file_paths: List[str],
    num_patients: int = None,
    template_path: str = None,
    output_dir: str = None
) -> Tuple[str, str]:
    """
    Main processing pipeline for NBS report files

    Args:
        file_paths: List of 3 file paths [AA, AC, AC_EXT files]
        num_patients: Number of patients (excluding 4 controls). If None, auto-detect from files.
        template_path: Path to Excel template file
        output_dir: Directory where output files should be saved

    Returns:
        Tuple of (excel_path, processed_data_json)
            - excel_path: Path to the generated final_results.xlsx file
            - processed_data_json: JSON string with processed data for frontend

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
        raw_combined_df = data_extraction.get_final_data(data[0], data[1], data[2], names)

        print(f"Final Data Frame Created - {raw_combined_df.shape[0]} Rows X {raw_combined_df.shape[1]} Columns")

        # Restructure data frames for controls and patients
        final_data_frame_list = [
            structure.redefine_dataframe(raw_combined_df[:2].copy(), c1_flag=True),
            structure.redefine_dataframe(raw_combined_df[2:4].copy(), c2_flag=True),
            structure.redefine_dataframe(raw_combined_df[4:].copy())
        ]

        # Serialize data to JSON for frontend review
        processed_data_json = serialize_processed_data(
            final_data_frame_list,
            raw_combined_df,
            names,
            date_code
        )

        # Skip Excel generation - we'll generate PDF after user approval (Phase 6)
        # For now, just create the output directory and return a placeholder path
        os.makedirs(os.path.join(output_dir, date_code), exist_ok=True)
        placeholder_path = os.path.join(output_dir, date_code, 'pending_approval.txt')

        # Write a placeholder file
        with open(placeholder_path, 'w') as f:
            f.write(f"Report processed on {date_code}\nAwaiting user approval for PDF generation.\n")

        print(f"Report processing completed successfully. Data ready for review.")
        return placeholder_path, processed_data_json

    except (data_extraction.DataExtractionError, structure.StructureError,
            excel_generation.ExcelGenerationError) as e:
        raise ReportProcessingError(f"Processing failed: {str(e)}")
    except Exception as e:
        raise ReportProcessingError(f"Unexpected error during processing: {str(e)}")
