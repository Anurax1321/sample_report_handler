# File validation service for NBS report uploads

import os
import re
from typing import Tuple

class FileValidationError(Exception):
    """Custom exception for file validation errors"""
    pass

def validate_filename(filename: str) -> Tuple[str, str]:
    """
    Validate filename follows NBS naming convention: DDMMYYYY_XX.txt

    Args:
        filename: Name of the uploaded file

    Returns:
        Tuple of (date_code, file_type) where date_code is DDMMYYYY and file_type is AA/AC/AC_EXT

    Raises:
        FileValidationError: If filename format is invalid
    """
    # Expected pattern: DDMMYYYY_XX.txt where XX is AA, AC, or AC_EXT
    pattern = r'^(\d{8})_(AA|AC|AC_EXT)\.txt$'
    match = re.match(pattern, filename)

    if not match:
        raise FileValidationError(
            f"Invalid filename format: '{filename}'. "
            f"Expected format: DDMMYYYY_AA.txt, DDMMYYYY_AC.txt, or DDMMYYYY_AC_EXT.txt"
        )

    date_code = match.group(1)
    file_type = match.group(2)

    # Validate date components
    day = int(date_code[0:2])
    month = int(date_code[2:4])
    year = int(date_code[4:8])

    if not (1 <= day <= 31):
        raise FileValidationError(f"Invalid day in filename: {day}")

    if not (1 <= month <= 12):
        raise FileValidationError(f"Invalid month in filename: {month}")

    if not (2000 <= year <= 2100):
        raise FileValidationError(f"Invalid year in filename: {year}")

    return date_code, file_type

def validate_three_files(file1_name: str, file2_name: str, file3_name: str) -> str:
    """
    Validate that three files have the same date and correct types

    Args:
        file1_name: First uploaded filename
        file2_name: Second uploaded filename
        file3_name: Third uploaded filename

    Returns:
        Common date code (DDMMYYYY)

    Raises:
        FileValidationError: If validation fails
    """
    # Validate each filename
    date1, type1 = validate_filename(file1_name)
    date2, type2 = validate_filename(file2_name)
    date3, type3 = validate_filename(file3_name)

    # Check all dates match
    if not (date1 == date2 == date3):
        raise FileValidationError(
            f"Date mismatch in uploaded files. "
            f"File 1: {date1}, File 2: {date2}, File 3: {date3}. "
            f"All files must have the same date."
        )

    # Check we have exactly one of each type
    file_types = {type1, type2, type3}
    expected_types = {'AA', 'AC', 'AC_EXT'}

    if file_types != expected_types:
        raise FileValidationError(
            f"Missing or duplicate file types. "
            f"Expected one of each: AA, AC, AC_EXT. "
            f"Got: {', '.join(sorted(file_types))}"
        )

    return date1

def validate_file_size(file_size: int, max_size_mb: int = 50) -> None:
    """
    Validate file size is within acceptable limits

    Args:
        file_size: Size of file in bytes
        max_size_mb: Maximum allowed size in megabytes

    Raises:
        FileValidationError: If file is too large
    """
    max_bytes = max_size_mb * 1024 * 1024

    if file_size > max_bytes:
        raise FileValidationError(
            f"File size ({file_size / 1024 / 1024:.2f} MB) exceeds "
            f"maximum allowed size ({max_size_mb} MB)"
        )

def validate_file_extension(filename: str, allowed_extensions: list = ['.txt']) -> None:
    """
    Validate file has an allowed extension

    Args:
        filename: Name of the file
        allowed_extensions: List of allowed extensions

    Raises:
        FileValidationError: If extension is not allowed
    """
    _, ext = os.path.splitext(filename)

    if ext.lower() not in allowed_extensions:
        raise FileValidationError(
            f"Invalid file extension: {ext}. "
            f"Allowed extensions: {', '.join(allowed_extensions)}"
        )
