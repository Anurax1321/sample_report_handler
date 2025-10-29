# Data extraction module adapted from Vijayrekha_python_reports
# Handles parsing of NBS laboratory text files

import os
import re
import pandas as pd
import numpy as np
from app.core.reference_ranges import MULTIPLICATION_FACTORS

class DataExtractionError(Exception):
    """Custom exception for data extraction errors"""
    pass

def get_final_data(AA, AC, AC_EXT, name):
    """
    Concatenate all three dataframes (AA, AC, AC_EXT) and add sample names

    Args:
        AA: DataFrame with amino acid data
        AC: DataFrame with acylcarnitine data
        AC_EXT: DataFrame with extended acylcarnitine data
        name: List of sample names

    Returns:
        Combined DataFrame with all compound data
    """
    final = pd.concat([AA, AC, AC_EXT], axis=1)
    final.insert(0, 'Sample text', name)
    return final.apply(lambda col: pd.to_numeric(col) if col.name != 'Sample text' else col)

def extraction(file_path: str, actual_no_of_patients: int):
    """
    Extract data from a single NBS laboratory text file

    Args:
        file_path: Path to the text file (_AA.txt, _AC.txt, or _AC_EXT.txt)
        actual_no_of_patients: Expected number of patients (includes 4 controls)

    Returns:
        Tuple of (DataFrame, list of names)

    Raises:
        DataExtractionError: If file format is invalid or data doesn't match expectations
    """
    compound, name, response, final_result = [], [], [], []
    no_of_patients = 0

    if not os.path.exists(file_path):
        file_type = _get_file_type(file_path)
        raise DataExtractionError(f"{file_type} File Path is invalid")

    if not (os.path.isfile(file_path) and file_path.endswith(".txt")):
        file_type = _get_file_type(file_path)
        raise DataExtractionError(f"{file_type} File is invalid")

    try:
        with open(file_path, 'r') as file:
            for line in file:
                if line == '\n':
                    continue

                # Extract compound names
                if line.strip().startswith("Compound"):
                    # Breaking conditions based on file type
                    if _should_break_parsing(line, file_path):
                        break

                    # Extract compound name
                    line_parts = line.split('  ')
                    compound.append(line_parts[1].strip())
                    continue

                # Process data lines (starting with a number)
                elif line.strip()[0].isdigit():
                    line_parts = line.split('\t')

                    # Validate controls (first 4 samples must be controls)
                    if line_parts[0] in ['1', '2', '3', '4']:
                        if not re.match(r'^CONTROL\d+$', line_parts[2].upper()):
                            raise DataExtractionError(
                                f"Controls not provided properly. Expected CONTROL but got: {line_parts[2]}"
                            )

                    # Track patient count
                    if no_of_patients < int(line_parts[0]):
                        no_of_patients = int(line_parts[0])

                    # Extract sample name
                    if line_parts[1] not in name:
                        name.append(line_parts[1])

                    # Extract response value (last column)
                    response.append(line_parts[-1].strip())

        # Validate patient count
        if actual_no_of_patients != no_of_patients:
            raise DataExtractionError(
                f"Patient count mismatch. Expected {actual_no_of_patients}, found {no_of_patients}"
            )

    except FileNotFoundError:
        raise DataExtractionError(f"File not found: {file_path}")
    except IndexError as e:
        raise DataExtractionError(f"File format error: {str(e)}")
    except Exception as e:
        raise DataExtractionError(f"Unexpected error during extraction: {str(e)}")

    # Apply multiplication factors and manipulate data
    final_result = _apply_multiplication_factors(
        compound, response, actual_no_of_patients, file_path
    )

    # Reshape data into 2D array (Fortran order - column-major)
    try:
        reshaped_array = np.array(final_result).reshape(
            len(name), len(compound), order='F'
        )
        return pd.DataFrame(reshaped_array, columns=compound), name

    except ValueError as e:
        raise DataExtractionError(f"Error reshaping data: {str(e)}")

def _get_file_type(file_path: str) -> str:
    """Determine file type from path"""
    if file_path.endswith("_AA.txt"):
        return "AA"
    elif file_path.endswith("_AC.txt"):
        return "AC"
    elif file_path.endswith("_AC_EXT.txt"):
        return "AC_EXT"
    else:
        return "Unknown"

def _should_break_parsing(line: str, file_path: str) -> bool:
    """Determine if we should stop parsing based on file type"""
    if file_path.endswith("_AA.txt"):
        return "Suac" in line
    elif file_path.endswith("_AC.txt") or file_path.endswith("_AC_EXT.txt"):
        return line.strip().endswith("IS")
    return False

def _apply_multiplication_factors(compound: list, response: list,
                                   num_patients: int, file_path: str) -> list:
    """
    Apply compound-specific multiplication factors to response values

    Args:
        compound: List of compound names
        response: List of raw response values
        num_patients: Total number of patients (including controls)
        file_path: Path to determine file type

    Returns:
        List of calculated final results
    """
    final_result = []
    k = 0  # Counter for total values

    file_type = _get_file_type(file_path)
    if file_type == "Unknown":
        raise DataExtractionError(f"Unknown file type: {file_path}")

    factors = MULTIPLICATION_FACTORS.get(file_type, {})

    for compound_name in compound:
        j = 0
        while j < num_patients:
            if k >= len(response):
                raise DataExtractionError(
                    "Not enough responses for the given number of patients and compounds"
                )

            # Handle empty responses
            if response[k] == '':
                final_result.append('0.0')
                k += 1
                j += 1
                continue

            # Get multiplication factor
            factor = _get_factor_for_compound(compound_name, file_type, factors)

            # Apply factor and store result
            result = float(response[k]) * factor
            final_result.append(result)

            k += 1
            j += 1

    # Validate result count
    if len(response) != len(final_result):
        raise DataExtractionError("Result count mismatch after multiplication")

    return final_result

def _get_factor_for_compound(compound_name: str, file_type: str, factors: dict) -> float:
    """Get the multiplication factor for a specific compound"""
    if file_type == "AA":
        # Glycine has special factor, others use default
        if compound_name == "Gly":
            return factors.get("Gly", 403)
        return factors.get("default", 80.6)

    elif file_type in ["AC", "AC_EXT"]:
        # Look up specific compound factor
        if compound_name not in factors:
            raise DataExtractionError(
                f"{file_type} file: Unknown compound '{compound_name}' for multiplication"
            )
        return factors[compound_name]

    else:
        raise DataExtractionError(f"Unknown file type for factor lookup: {file_type}")
