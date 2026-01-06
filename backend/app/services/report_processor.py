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
    ratio_columns = [
        'TotalCN',              # Total Carnitines
        'Met/Leu', 'Met/Phe', 'Phe/Tyr', 'Leu/Ala', 'Leu/Tyr',  # Amino acid ratios
        'C4/C3', 'C3/C0', 'C3/C2', 'C8/C10', 'C8/C2',  # Acylcarnitine ratios
        'C0/(C16+C18)', 'C5/C2', 'C5/C3', 'C5DC/C3', 'C5DC/C16'
    ]
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

        # Calculate ratio values
        def safe_get_value(compound_name):
            """Safely get compound value, return None if not available"""
            val = row_data['values'].get(compound_name, {}).get('value')
            return float(val) if val is not None and pd.notna(val) else None

        def safe_divide(numerator, denominator):
            """Safely divide two values, return None if either is None or denominator is 0"""
            if numerator is None or denominator is None or denominator == 0:
                return None
            return numerator / denominator

        # Skip ratio calculations for control samples - they're only for quality control
        # Controls won't be included in the PDF, so no need to calculate their ratios
        if row_data['is_control_1'] or row_data['is_control_2']:
            # For controls, set all ratios to None (blank)
            ratio_values = {ratio_col: None for ratio_col in ratio_columns}
        else:
            # Calculate ratios only for patient samples
            # Calculate TotalCN: sum of all compounds starting with 'C'
            total_cn = 0
            total_cn_count = 0
            for compound in compound_columns:
                if compound.startswith('C'):
                    val = safe_get_value(compound)
                    if val is not None:
                        total_cn += val
                        total_cn_count += 1

            total_cn_value = total_cn if total_cn_count > 0 else None

            # Calculate amino acid ratios
            met = safe_get_value('Met')
            leu = safe_get_value('Leu')
            phe = safe_get_value('Phe')
            tyr = safe_get_value('Tyr')
            ala = safe_get_value('Ala')

            met_leu_ratio = safe_divide(met, leu)
            met_phe_ratio = safe_divide(met, phe)
            phe_tyr_ratio = safe_divide(phe, tyr)
            leu_ala_ratio = safe_divide(leu, ala)
            leu_tyr_ratio = safe_divide(leu, tyr)

            # Calculate acylcarnitine ratios
            c0 = safe_get_value('C0')
            c2 = safe_get_value('C2')
            c3 = safe_get_value('C3')
            c4 = safe_get_value('C4')
            c5 = safe_get_value('C5')
            c5dc = safe_get_value('C5DC')
            c8 = safe_get_value('C8')
            c10 = safe_get_value('C10')
            c16 = safe_get_value('C16')
            c18 = safe_get_value('C18')

            c4_c3_ratio = safe_divide(c4, c3)
            c3_c0_ratio = safe_divide(c3, c0)
            c3_c2_ratio = safe_divide(c3, c2)
            c8_c10_ratio = safe_divide(c8, c10)
            c8_c2_ratio = safe_divide(c8, c2)

            # C0/(C16+C18) - special case with sum in denominator
            c16_c18_sum = (c16 if c16 is not None else 0) + (c18 if c18 is not None else 0)
            c0_c16c18_ratio = safe_divide(c0, c16_c18_sum if c16_c18_sum > 0 else None)

            c5_c2_ratio = safe_divide(c5, c2)
            c5_c3_ratio = safe_divide(c5, c3)
            c5dc_c3_ratio = safe_divide(c5dc, c3)
            c5dc_c16_ratio = safe_divide(c5dc, c16)

            # Map calculated values to ratio columns
            ratio_values = {
                'TotalCN': total_cn_value,
                # Amino acid ratios
                'Met/Leu': met_leu_ratio,
                'Met/Phe': met_phe_ratio,
                'Phe/Tyr': phe_tyr_ratio,
                'Leu/Ala': leu_ala_ratio,
                'Leu/Tyr': leu_tyr_ratio,
                # Acylcarnitine ratios
                'C4/C3': c4_c3_ratio,
                'C3/C0': c3_c0_ratio,
                'C3/C2': c3_c2_ratio,
                'C8/C10': c8_c10_ratio,
                'C8/C2': c8_c2_ratio,
                'C0/(C16+C18)': c0_c16c18_ratio,
                'C5/C2': c5_c2_ratio,
                'C5/C3': c5_c3_ratio,
                'C5DC/C3': c5dc_c3_ratio,
                'C5DC/C16': c5dc_c16_ratio
            }

        # Add ratio columns with calculated values and color coding
        for ratio in ratio_columns:
            ratio_value = ratio_values.get(ratio)

            # Determine color for ratio value using ratio reference ranges
            ratio_color = 'none'
            if ratio_value is not None and ratio in ratio_range_dict:
                min_val, max_val = ratio_range_dict[ratio]
                if min_val <= ratio_value <= max_val:
                    ratio_color = 'green'
                else:
                    # Check if critically out of range (>50% beyond limits)
                    lower_critical = min_val * 0.5
                    upper_critical = max_val * 1.5
                    if ratio_value < lower_critical or ratio_value > upper_critical:
                        ratio_color = 'red'
                    else:
                        ratio_color = 'yellow'

            row_data['values'][ratio] = {
                'value': ratio_value,
                'color': ratio_color
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
