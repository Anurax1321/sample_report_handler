"""
Neonatal Screening Report Analyzer Service
Reads PDF reports, validates values against reference ranges, and flags abnormalities.
Adapted for FastAPI backend from rainbow_report_verification project.
"""

import os
import re
import zipfile
import tempfile
import shutil
import threading
import logging
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import pdfplumber

# Configure logging
logger = logging.getLogger(__name__)


# Timeout configuration
PDF_PROCESSING_TIMEOUT = 30  # seconds per PDF


class TimeoutError(Exception):
    """Raised when PDF processing exceeds timeout."""
    pass


class TimeoutContext:
    """Cross-platform context manager for adding timeout to operations.

    Uses threading.Timer instead of signal.SIGALRM for Windows compatibility.
    """
    def __init__(self, seconds=30, error_message='Operation timed out'):
        self.seconds = seconds
        self.error_message = error_message
        self.timer = None
        self.timed_out = False

    def _timeout_handler(self):
        """Called when timeout expires."""
        self.timed_out = True

    def __enter__(self):
        """Start the timeout timer."""
        self.timer = threading.Timer(self.seconds, self._timeout_handler)
        self.timer.start()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Stop the timer and check if timeout occurred."""
        if self.timer:
            self.timer.cancel()
        if self.timed_out:
            raise TimeoutError(self.error_message)
        return False


class NeonatalReportAnalyzer:
    """Analyzes neonatal screening reports from PDF files."""

    def __init__(self, pdf_path: str, relative_path: str = None):
        """Initialize with path to PDF file.

        Note: File existence is not checked here to avoid race conditions.
        The file will be validated when extract_text_from_pdf() is called.
        """
        self.pdf_path = Path(pdf_path)

        # Store relative path for display (e.g., "HYDERABAD/BABY OF X.pdf")
        self.relative_path = relative_path or self.pdf_path.name

        self.patient_info = {}
        self.biochemical_params = []
        self.amino_acids = []
        self.amino_acid_ratios = []
        self.acylcarnitines = []
        self.acylcarnitine_ratios = []
        self.raw_text = ""
        self.abnormalities = []  # Track all abnormal findings
        self.format_type = 'original'  # 'original' or 'vrls'
        self.format_type = 'original'  # Will be set by detect_format()

    def extract_text_from_pdf(self, quiet: bool = True) -> str:
        """Extract all text from PDF with timeout protection."""
        # Validate file exists (moved from __init__ to avoid race conditions)
        if not self.pdf_path.exists():
            raise FileNotFoundError(f"PDF file not found: {self.pdf_path}")

        all_text = []
        try:
            with TimeoutContext(
                PDF_PROCESSING_TIMEOUT,
                f"PDF processing timed out after {PDF_PROCESSING_TIMEOUT} seconds. The file may be too large or corrupted."
            ):
                with pdfplumber.open(self.pdf_path) as pdf:
                    for i, page in enumerate(pdf.pages, 1):
                        text = page.extract_text()
                        all_text.append(f"\n--- PAGE {i} ---\n{text}")
        except TimeoutError as e:
            raise RuntimeError(str(e))
        except Exception as e:
            raise RuntimeError(f"Error reading PDF: {e}")

        self.raw_text = "\n".join(all_text)
        self.format_type = self.detect_format()
        return self.raw_text

    def detect_format(self):
        """Detect PDF format from extracted text markers."""
        if '1. Amino acids:' in self.raw_text or 'S.No Metabolite Conc.' in self.raw_text:
            return 'vrls'
        return 'original'

    def parse_patient_info(self):
        """Extract patient information from the report."""
        if self.format_type == 'vrls':
            return self._parse_patient_info_vrls()

        text = self.raw_text

        # Extract patient name
        name_match = re.search(r'Patient Name\s+(.+?)(?:\n|Collected)', text)
        if name_match:
            self.patient_info['name'] = name_match.group(1).strip()

        # Extract age/gender
        age_match = re.search(r'Age/Gender\s+(.+?)(?:\n|Received)', text)
        if age_match:
            self.patient_info['age_gender'] = age_match.group(1).strip()

        # Extract UHID
        uhid_match = re.search(r'UHID\s+(.+?)(?:\n|Reported)', text)
        if uhid_match:
            self.patient_info['uhid'] = uhid_match.group(1).strip()

        # Extract Referred By
        ref_match = re.search(r'Referred By\s+(.+?)(?:\n|Reference)', text)
        if ref_match:
            self.patient_info['referred_by'] = ref_match.group(1).strip()

        # Extract dates
        collected_match = re.search(r'Collected on\s+(.+?)(?:\n|$)', text)
        if collected_match:
            self.patient_info['collected_on'] = collected_match.group(1).strip()

        received_match = re.search(r'Received on\s+(.+?)(?:\n|$)', text)
        if received_match:
            self.patient_info['received_on'] = received_match.group(1).strip()

        reported_match = re.search(r'Reported on\s+(.+?)(?:\n|$)', text)
        if reported_match:
            self.patient_info['reported_on'] = reported_match.group(1).strip()

    def _parse_patient_info_vrls(self):
        """Parse patient info from VRLS format PDF."""
        text = self.raw_text

        # VRLS cover page fields (with colons)
        name_match = re.search(r'PATIENT\s*NAME\s*:\s*(.+?)(?:\s{2,}|SAMPLE)', text)
        if name_match:
            self.patient_info['name'] = name_match.group(1).strip()
        else:
            # No cover page — try Annexure header
            name_match = re.search(r'Patient Name:\s*(.+)', text)
            if name_match:
                self.patient_info['name'] = name_match.group(1).strip()

        age_match = re.search(r'AGE/\s*GENDER\s*:\s*(.+?)(?:\s{2,}|REGISTERED)', text)
        if age_match:
            self.patient_info['age_gender'] = age_match.group(1).strip()

        req_match = re.search(r'REQ\s*NO\s*:\s*(.+?)(?:\s{2,}|REPORTED)', text)
        if req_match:
            self.patient_info['uhid'] = req_match.group(1).strip()

        collected_match = re.search(r'COLLECTED\s*ON\s*:\s*(.+?)(?:\n|$)', text)
        if collected_match:
            self.patient_info['collected_on'] = collected_match.group(1).strip()

        reported_match = re.search(r'REPORTED\s*ON\s*:\s*(.+?)(?:\n|$)', text)
        if reported_match:
            self.patient_info['reported_on'] = reported_match.group(1).strip()

        ref_match = re.search(r'CLIENT\s*DETAILS\s*:\s*(.+?)(?:\s{2,}|REF\.)', text)
        if ref_match:
            self.patient_info['referred_by'] = ref_match.group(1).strip()

    def parse_biochemical_parameters(self):
        """Parse biochemical parameters from Page 1."""
        if self.format_type == 'vrls':
            return  # VRLS format doesn't include biochemical parameters in same format
        text = self.raw_text

        # List of biochemical parameters to look for
        params = ['TSH(CH)', '17-OHP (CAH)', 'G-6PD', 'TGAL', 'BIOTINDASE',
                  'PHENYLALANINE', 'IRT']

        for param in params:
            # Try to find the parameter and its result
            pattern = rf'{re.escape(param)}\s+(\w+)'
            match = re.search(pattern, text)
            if match:
                result = match.group(1).strip()
                self.biochemical_params.append({
                    'parameter': param,
                    'result': result,
                    'method': 'Fluoroimmunoassay' if 'TSH' in param or '17-OHP' in param or 'IRT' in param else 'Enzyme Assay'
                })

    def parse_amino_acids(self):
        """Parse amino acids table from Page 2."""
        if self.format_type == 'vrls':
            return self._parse_amino_acids_vrls()

        text = self.raw_text

        # Define amino acids in order as they appear in the table
        amino_acids_list = [
            'ALANINE', 'ARGININE', 'ASPARTIC ACID', 'CITRULINE',
            'GLUTAMIC ACID', 'GLYCINE', 'LEUCINE', 'METHIONINE',
            'ORNITHINE', 'PHENYLALANINE', 'PROLINE', 'TYROSINE', 'VALINE'
        ]

        for aa in amino_acids_list:
            # Pattern: AMINO_ACID_NAME followed by numeric value and range
            # Example: ALANINE 328.4 72.5-816
            pattern = rf'{aa}\s+([\d.]+)\s+([\d.<>\-]+)'
            match = re.search(pattern, text)
            if match:
                value = match.group(1).strip()
                ref_range = match.group(2).strip()
                self.amino_acids.append({
                    'analyte': aa,
                    'value': float(value),
                    'reference_range': ref_range,
                    'unit': 'uM'
                })

    def parse_amino_acid_ratios(self):
        """Parse amino acid molar ratios from Page 2."""
        if self.format_type == 'vrls':
            return self._parse_amino_acid_ratios_vrls()

        text = self.raw_text

        # Define ratios in order
        ratios_list = ['MET/LEU', 'MET/PHE', 'PKU', 'LEU/ALA', 'LEU/TYR']

        for ratio in ratios_list:
            # Pattern: RATIO value range
            # Example: MET/LEU 0.11 <0.42  OR  MET/LEU 0.11 < 0.42
            # Handles spaces after < > and around dashes in ranges
            pattern = rf'{re.escape(ratio)}\s+([\d.]+)\s+([<>\d.\s\-]+?)(?:\s+\d+\s+|\n|$)'
            match = re.search(pattern, text)
            if match:
                value = match.group(1).strip()
                ref_range = match.group(2).strip()
                self.amino_acid_ratios.append({
                    'ratio': ratio,
                    'value': float(value),
                    'reference_range': ref_range
                })

    def parse_acylcarnitines(self):
        """Parse acylcarnitines from Page 3."""
        if self.format_type == 'vrls':
            return self._parse_acylcarnitines_vrls()

        text = self.raw_text

        # Define acylcarnitines in order
        acyl_list = [
            'TOTAL CARNITINES', 'FREE CARNITINE', 'ACYLCARNITINES', 'AC/TC',
            'C2', 'C3', 'C4', 'C4OH/C3DC', 'C5', 'C5:1', 'C5DC', 'C5OH/C4DC',
            'C6', 'C6DC', 'C8', 'C10', 'C10:1', 'C10:2', 'C12', 'C12:1',
            'C14', 'C14:1', 'C14:2', 'C14OH', 'C16', 'C16:1', 'C16:1OH', 'C16OH',
            'C18', 'C18:1', 'C18:1OH', 'C18:2', 'C8:1'
        ]

        for acyl in acyl_list:
            # Pattern: ANALYTE value range
            # Handle ranges with spaces like "0.00 - 0.5" or "0.00 -0.429"
            # Example: C2 8.583 1.26-88
            # (?<![/]) prevents matching C3 inside C4/C3 ratio names (two-column PDF layout)
            pattern = rf'(?<![/]){re.escape(acyl)}\s+([\d.]+)\s+([\d.<>\s\-]+?)(?:\s+\d+\s+|\n|$)'
            match = re.search(pattern, text)
            if match:
                value = match.group(1).strip()
                ref_range = match.group(2).strip()
                self.acylcarnitines.append({
                    'analyte': acyl,
                    'value': float(value),
                    'reference_range': ref_range,
                    'unit': 'uM'
                })

    def parse_acylcarnitine_ratios(self):
        """Parse acylcarnitine molar ratios from Page 3."""
        if self.format_type == 'vrls':
            return self._parse_acylcarnitine_ratios_vrls()

        text = self.raw_text

        # Define ratios — order longest first to avoid partial matches
        ratios_list = [
            'C0/(C16+C18)',
            'C5DC/C16', 'C5DC/C3', 'C5DC/C5OH',
            'C5:1/C0',
            'C14:1/C16', 'C14:1/C2',
            'C16OH/C16',
            'C8/C10', 'C8/C12', 'C8/C2',
            'C4/C2', 'C4/C3', 'C4/C8',
            'C3/C16', 'C3/C0', 'C3/C2',
            'C5/C0', 'C5/C2', 'C5/C3',
        ]

        for ratio in ratios_list:
            # Pattern: RATIO value range
            # Handles: "<0.42", "< 0.42", ">5.0", "> 5.0", "0.04-0.50", "0.04 - 0.50"
            pattern = rf'{re.escape(ratio)}\s+([\d.]+)\s+([<>\d.\s\-]+?)(?:\s+\d+\s+|\n|$)'
            match = re.search(pattern, text)
            if match:
                value = match.group(1).strip()
                ref_range = match.group(2).strip()
                self.acylcarnitine_ratios.append({
                    'ratio': ratio,
                    'value': float(value),
                    'reference_range': ref_range
                })
            else:
                # Only log if the ratio name appears in the text (i.e. present but unparseable)
                if ratio in text or re.escape(ratio).replace('\\', '') in text:
                    logger.warning(
                        f"File {self.relative_path}: Found '{ratio}' in text but regex failed to parse it"
                    )

    def _parse_amino_acids_vrls(self):
        """Parse amino acids from VRLS format PDF (mixed-case names)."""
        text = self.raw_text

        # Map VRLS mixed-case names to our standard uppercase names
        aa_names = {
            'Alanine': 'ALANINE', 'Arginine': 'ARGININE', 'Aspartic acid': 'ASPARTIC ACID',
            'Citrulline': 'CITRULINE', 'Glutamic acid': 'GLUTAMIC ACID', 'Glycine': 'GLYCINE',
            'Leucine': 'LEUCINE', 'Methionine': 'METHIONINE', 'Ornithine': 'ORNITHINE',
            'Phenylalanine': 'PHENYLALANINE', 'Proline': 'PROLINE', 'Tyrosine': 'TYROSINE',
            'Valine': 'VALINE'
        }

        for vrls_name, standard_name in aa_names.items():
            pattern = rf'{re.escape(vrls_name)}\s+([\d.]+)\s+([\d.\-<>]+)'
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                value = match.group(1).strip()
                ref_range = match.group(2).strip()
                self.amino_acids.append({
                    'analyte': standard_name,
                    'value': float(value),
                    'reference_range': ref_range,
                    'unit': 'uM'
                })

    def _parse_amino_acid_ratios_vrls(self):
        """Parse amino acid molar ratios from VRLS format (spaces around /)."""
        text = self.raw_text

        # Map VRLS ratio names to standard names
        vrls_ratios = {
            'Met / Leu': 'MET/LEU',
            'Met / Phe': 'MET/PHE',
            'Phe / Tyr': 'PKU',
            'Leu / Ala': 'LEU/ALA',
            'Leu / Tyr': 'LEU/TYR'
        }

        for vrls_name, standard_name in vrls_ratios.items():
            # Handle "Phe / Tyr (PKU)" specially
            pattern = rf'{re.escape(vrls_name)}(?:\s*\(PKU\))?\s+([\d.]+)\s+([<>\d.\s\-]+?)(?:\s+\d+\s+|\n|$)'
            match = re.search(pattern, text)
            if match:
                value = match.group(1).strip()
                ref_range = match.group(2).strip()
                self.amino_acid_ratios.append({
                    'ratio': standard_name,
                    'value': float(value),
                    'reference_range': ref_range
                })

    def _parse_acylcarnitines_vrls(self):
        """Parse acylcarnitines from VRLS format.

        The VRLS acylcarnitines table is a two-column layout with S.No 1-35.
        Each entry has its abbreviation in parentheses (e.g., (C0), (C2)).
        Strategy: Find each abbreviation in the section text and extract
        the nearest value+range pair, handling both "value before abbr"
        and "value after abbr" layouts.
        """
        text = self.raw_text

        # Map abbreviation -> standard analyte name
        abbr_to_standard = {
            'C0': 'FREE CARNITINE', 'C2': 'C2', 'C3': 'C3', 'C4': 'C4',
            'C4OH': 'C4OH/C3DC', 'C4DC': 'C4DC',
            'C3DC': 'C3DC', 'C5': 'C5', 'C5:1': 'C5:1',
            'C5DC': 'C5DC', 'C5OH': 'C5OH/C4DC',
            'C6': 'C6', 'C6DC': 'C6DC',
            'C8': 'C8', 'C8:1': 'C8:1',
            'C10': 'C10', 'C10:1': 'C10:1', 'C10:2': 'C10:2',
            'C12': 'C12', 'C12:1': 'C12:1',
            'C14': 'C14', 'C14:1': 'C14:1', 'C14:2': 'C14:2', 'C14OH': 'C14OH',
            'C16': 'C16', 'C16:1': 'C16:1', 'C16:1OH': 'C16:1OH', 'C16OH': 'C16OH',
            'C18': 'C18', 'C18:1': 'C18:1', 'C18:2': 'C18:2',
            'C18:2OH': 'C18:2OH', 'C18:1OH': 'C18:1OH', 'C18OH': 'C18OH'
        }

        # Extract the acylcarnitines section
        ac_start = text.find('3. Acylcarnitines:')
        ac_end = text.find('4. Acylcarnitine molar ratios:')
        if ac_start < 0 or ac_end < 0:
            return
        section = text[ac_start:ac_end]

        # Extract all value+range pairs from data lines in order of appearance.
        # A data line has pattern: optional_text value range optional_text value range
        # value is a decimal number, range is like "5-125" or "0.01-0.90" or "0.00-0.20"
        # We collect ALL (value, range, position) tuples from the section.
        all_data_points = []
        for m in re.finditer(r'(?<!\d)([\d.]+)\s+([\d.]+-[\d.]+|[<>]\s*[\d.]+)', section):
            val_str = m.group(1)
            ref_str = m.group(2).strip()
            try:
                val = float(val_str)
                # Filter out S.No numbers (integers 1-35 without decimal)
                if '.' not in val_str and val <= 35:
                    continue
                all_data_points.append((val, ref_str, m.start()))
            except ValueError:
                continue

        # Find all abbreviation positions in the section, longest-first to avoid
        # substring matches (e.g., C16:1OH before C16:1 before C16)
        abbrs_sorted = sorted(abbr_to_standard.keys(), key=len, reverse=True)
        abbr_positions = {}  # abbr -> position in section
        matched_spans = []  # track matched spans to avoid substring overlaps

        for abbr in abbrs_sorted:
            pattern = rf'\({re.escape(abbr)}\)'
            for m in re.finditer(pattern, section):
                pos = m.start()
                # Check this position doesn't overlap with an already-matched longer abbr
                overlaps = False
                for span_start, span_end in matched_spans:
                    if pos >= span_start and pos < span_end:
                        overlaps = True
                        break
                if not overlaps:
                    abbr_positions[abbr] = pos
                    matched_spans.append((m.start(), m.end()))
                    break  # take first non-overlapping match

        # Known S.No to abbreviation mapping (consistent across VRLS PDFs).
        # This gives us the expected ORDER of data points.
        sno_to_abbr = {
            1: 'C0', 2: 'TC', 3: 'C2', 4: 'C3', 5: 'C3DC',
            6: 'C4', 7: 'C4OH', 8: 'C4DC', 9: 'C5', 10: 'C5:1',
            11: 'C5DC', 12: 'C5OH', 13: 'C6', 14: 'C6DC',
            15: 'C8', 16: 'C8:1', 17: 'C10', 18: 'C10:1', 19: 'C10:2',
            20: 'C12', 21: 'C12:1', 22: 'C14', 23: 'C14:1', 24: 'C14:2',
            25: 'C14OH', 26: 'C16', 27: 'C16:1', 28: 'C16:1OH', 29: 'C16OH',
            30: 'C18', 31: 'C18:2', 32: 'C18:1', 33: 'C18:2OH',
            34: 'C18:1OH', 35: 'C18OH'
        }

        # The two-column table produces data points in a specific order:
        # Left col items appear first on each line, right col items second.
        # The pairs are: (1,8), (2,9), (3,10), (4,11), (5,12), (6,13), (7,14),
        # (15,26), (16,27), (17,28), (18,29), (19,30), (20,31), (21,32),
        # (22,33), (23,34), (24,35), (25,-)
        data_order = [
            1, 8, 2, 9, 3, 10, 4, 11, 5, 12, 6, 13, 7, 14,
            15, 26, 16, 27, 17, 28, 18, 29, 19, 30, 20, 31, 21, 32,
            22, 33, 23, 34, 24, 35, 25
        ]

        # Map data points to S.Nos by position order
        # "Total Carnitines" data point is special — it has text before the value
        # First, handle Total Carnitines separately
        tc_match = re.search(r'Total Carnitines\s+([\d.]+)\s+([\d.\-]+)', section)
        tc_val = None
        tc_ref = None
        tc_pos = -1
        if tc_match:
            tc_val = float(tc_match.group(1))
            tc_ref = tc_match.group(2).strip()
            tc_pos = tc_match.start()

        # Now assign data points to S.Nos in order
        # Filter out the Total Carnitines data point from all_data_points
        # Only filter the exact TC value match (91.36 10-184), not nearby entries
        tc_val_pos = -1
        if tc_match:
            # Find the position of the value within the TC match
            tc_val_str = tc_match.group(1)
            tc_val_pos = tc_match.start() + tc_match.group(0).index(tc_val_str)
        filtered_data = []
        for val, ref, pos in all_data_points:
            # Skip only the exact TC value (position within a few chars of TC's value)
            if tc_val_pos >= 0 and abs(pos - tc_val_pos) < len(tc_match.group(1)) + 2:
                continue
            filtered_data.append((val, ref, pos))

        # Sort by position
        filtered_data.sort(key=lambda x: x[2])

        # Remove S.No 2 (Total Carnitines) from data_order
        data_order_no_tc = [s for s in data_order if s != 2]

        # Assign each data point to the corresponding S.No
        for i, sno in enumerate(data_order_no_tc):
            if i >= len(filtered_data):
                break
            val, ref, pos = filtered_data[i]
            abbr = sno_to_abbr.get(sno)
            if abbr and abbr != 'TC':
                standard_name = abbr_to_standard.get(abbr, abbr)
                self.acylcarnitines.append({
                    'analyte': standard_name,
                    'value': val,
                    'reference_range': ref,
                    'unit': 'uM'
                })

        # Add Total Carnitines
        if tc_val is not None:
            self.acylcarnitines.append({
                'analyte': 'TOTAL CARNITINES',
                'value': tc_val,
                'reference_range': tc_ref,
                'unit': 'uM'
            })

    def _parse_acylcarnitine_ratios_vrls(self):
        """Parse acylcarnitine molar ratios from VRLS format (spaces around /)."""
        text = self.raw_text

        # Map VRLS ratio names to standard names
        vrls_ac_ratios = {
            'C4 / C3': 'C4/C3',
            'C3 / C0': 'C3/C0',
            'C3 / C2': 'C3/C2',
            'C8 / C10': 'C8/C10',
            'C8 / C2': 'C8/C2',
            'C5 / C2': 'C5/C2',
            'C5 / C3': 'C5/C3',
            'C5DC / C3': 'C5DC/C3',
            'C5DC / C16': 'C5DC/C16',
        }

        for vrls_name, standard_name in vrls_ac_ratios.items():
            pattern = rf'{re.escape(vrls_name)}\s+([\d.]+)\s+([<>\d.\s\-]+?)(?:\s+\d+\s+|\n|$)'
            match = re.search(pattern, text)
            if match:
                value = match.group(1).strip()
                ref_range = match.group(2).strip()
                self.acylcarnitine_ratios.append({
                    'ratio': standard_name,
                    'value': float(value),
                    'reference_range': ref_range
                })

        # Special case: C0 / ( C16 + C18) — VRLS has two layouts:
        # Layout 1: "6 C0 / 4.33 <70\n( C16 + C18)"  (value on same line as C0/)
        # Layout 2: "C0 /\n1 C4/C3 ... 6 6.66 <70\n( C16 + C18)"  (C0/ on own line)
        # Try layout 1 first
        c0_match = re.search(r'(?<!/\s)C0\s*/\s*([\d.]+)\s+([<>\d.\s\-]+?)(?:\s+\d+\s+|\n)', text)
        if not c0_match:
            # Layout 2: find "( C16 + C18)" and look for value+range just before it
            c16_18_match = re.search(r'\(\s*C16\s*\+\s*C18\s*\)', text)
            if c16_18_match:
                # Get the line before ( C16 + C18) — value is at end of that line
                preceding = text[:c16_18_match.start()].rstrip()
                # Find last value+range pair: "6.66 <70" or "4.33 <70"
                val_match = re.search(r'([\d.]+)\s+([<>]\s*[\d.]+)\s*$', preceding)
                if val_match:
                    c0_match = val_match
        if c0_match:
            self.acylcarnitine_ratios.append({
                'ratio': 'C0/(C16+C18)',
                'value': float(c0_match.group(1).strip()),
                'reference_range': c0_match.group(2).strip()
            })

    def parse_reference_range(self, range_str: str) -> Tuple[Optional[float], Optional[float]]:
        """
        Parse reference range string into min and max values.

        Formats supported:
        - "<3.00" -> (None, 3.0)
        - ">5.0" -> (5.0, None)
        - "0.9-45" -> (0.9, 45.0)
        - "0-1256" -> (0.0, 1256.0)
        - "72.5-816" -> (72.5, 816.0)
        - "0.00 - 0.5" -> (0.0, 0.5)
        - "0.00 -0.429" -> (0.0, 0.429)

        Returns: (min_value, max_value) where None means no limit
        """
        range_str = range_str.strip()

        # Handle < (less than - only upper limit)
        if range_str.startswith('<'):
            remainder = range_str[1:].strip()
            if not remainder:
                return (None, None)
            try:
                max_val = float(remainder)
                return (None, max_val)
            except ValueError:
                return (None, None)

        # Handle > (greater than - only lower limit)
        if range_str.startswith('>'):
            remainder = range_str[1:].strip()
            if not remainder:
                return (None, None)
            try:
                min_val = float(remainder)
                return (min_val, None)
            except ValueError:
                return (None, None)

        # Handle range with dash (e.g., "0.9-45" or "0.00 - 0.5")
        if '-' in range_str:
            # Remove spaces for easier parsing
            normalized = range_str.replace(' ', '')

            # Special handling for negative numbers
            # Try to parse as "min-max" where min and/or max could be negative
            try:
                # Approach: find the last dash that separates min from max
                # For "-5-10": we want min=-5, max=10
                # For "-10--5": we want min=-10, max=-5
                # For "0.9-45": we want min=0.9, max=45

                # Check if it starts with negative
                if normalized.startswith('-'):
                    # Remove leading '-' temporarily
                    temp = normalized[1:]

                    # Find the next '-' which is the separator
                    if '-' in temp:
                        separator_idx = temp.index('-')
                        min_str = '-' + temp[:separator_idx]
                        max_str = temp[separator_idx+1:]

                        min_val = float(min_str)
                        max_val = float(max_str)
                        return (min_val, max_val)
                else:
                    # Positive start, just split normally
                    parts = normalized.split('-')
                    if len(parts) == 2:
                        min_val = float(parts[0])
                        max_val = float(parts[1])
                        return (min_val, max_val)
            except (ValueError, IndexError):
                pass

        # Single value (treat as exact or use as upper limit)
        try:
            val = float(range_str)
            return (None, val)
        except ValueError:
            return (None, None)

    def is_value_in_range(self, value: float, range_str: str) -> Tuple[bool, str]:
        """
        Check if a value is within the reference range.

        Returns: (is_normal, reason)
        """
        min_val, max_val = self.parse_reference_range(range_str)

        # If we couldn't parse the range, log warning and flag for review
        if min_val is None and max_val is None:
            logger.warning(
                f"Unable to parse reference range '{range_str}' for value {value} "
                f"in file {self.relative_path}. Marking for manual review."
            )
            return (False, f"NEEDS REVIEW: Unparseable range '{range_str}'")

        # Check lower bound
        if min_val is not None and value < min_val:
            return (False, f"Below minimum ({min_val})")

        # Check upper bound
        if max_val is not None and value > max_val:
            return (False, f"Above maximum ({max_val})")

        return (True, "Within range")

    def validate_all_values(self):
        """Validate all parsed values against their reference ranges."""
        self.abnormalities = []
        unparseable_ranges = 0

        # Validate amino acids
        for aa in self.amino_acids:
            is_normal, reason = self.is_value_in_range(aa['value'], aa['reference_range'])
            aa['is_normal'] = is_normal
            aa['validation_reason'] = reason

            if not is_normal:
                self.abnormalities.append({
                    'category': 'Amino Acid',
                    'analyte': aa['analyte'],
                    'value': aa['value'],
                    'reference_range': aa['reference_range'],
                    'reason': reason,
                    'unit': aa.get('unit', '')
                })

        # Validate amino acid ratios
        for ratio in self.amino_acid_ratios:
            is_normal, reason = self.is_value_in_range(ratio['value'], ratio['reference_range'])
            ratio['is_normal'] = is_normal
            ratio['validation_reason'] = reason

            if not is_normal:
                self.abnormalities.append({
                    'category': 'Amino Acid Ratio',
                    'analyte': ratio['ratio'],
                    'value': ratio['value'],
                    'reference_range': ratio['reference_range'],
                    'reason': reason,
                    'unit': ''
                })

        # Validate acylcarnitines
        for acyl in self.acylcarnitines:
            is_normal, reason = self.is_value_in_range(acyl['value'], acyl['reference_range'])
            acyl['is_normal'] = is_normal
            acyl['validation_reason'] = reason

            if not is_normal:
                self.abnormalities.append({
                    'category': 'Acylcarnitine',
                    'analyte': acyl['analyte'],
                    'value': acyl['value'],
                    'reference_range': acyl['reference_range'],
                    'reason': reason,
                    'unit': acyl.get('unit', '')
                })

        # Validate acylcarnitine ratios
        for ratio in self.acylcarnitine_ratios:
            is_normal, reason = self.is_value_in_range(ratio['value'], ratio['reference_range'])
            ratio['is_normal'] = is_normal
            ratio['validation_reason'] = reason

            if not is_normal:
                self.abnormalities.append({
                    'category': 'Acylcarnitine Ratio',
                    'analyte': ratio['ratio'],
                    'value': ratio['value'],
                    'reference_range': ratio['reference_range'],
                    'reason': reason,
                    'unit': ''
                })

        # Count unparseable ranges
        for abn in self.abnormalities:
            if 'NEEDS REVIEW' in abn['reason']:
                unparseable_ranges += 1

        # Log summary
        if unparseable_ranges > 0:
            logger.warning(
                f"File {self.relative_path}: Found {unparseable_ranges} unparseable reference ranges. "
                f"Total abnormalities: {len(self.abnormalities)}"
            )
        else:
            logger.info(
                f"File {self.relative_path}: Validation complete. "
                f"Abnormalities: {len(self.abnormalities)}"
            )

    def get_summary(self) -> Dict:
        """Get a summary of the analysis results."""
        total_tests = (len(self.amino_acids) + len(self.amino_acid_ratios) +
                      len(self.acylcarnitines) + len(self.acylcarnitine_ratios))

        num_abnormal = len(self.abnormalities)
        num_normal = total_tests - num_abnormal

        return {
            'total_tests': total_tests,
            'normal_count': num_normal,
            'abnormal_count': num_abnormal,
            'status': 'normal' if num_abnormal == 0 else 'abnormal'
        }

    def to_dict(self) -> Dict:
        """Convert analyzer results to dictionary for API response."""
        return {
            'file_name': self.relative_path,
            'patient_info': self.patient_info,
            'biochemical_params': self.biochemical_params,
            'amino_acids': self.amino_acids,
            'amino_acid_ratios': self.amino_acid_ratios,
            'acylcarnitines': self.acylcarnitines,
            'acylcarnitine_ratios': self.acylcarnitine_ratios,
            'abnormalities': self.abnormalities,
            'summary': self.get_summary()
        }


def extract_zip_file(zip_path: Path) -> Tuple[Path, List[Tuple[Path, str]]]:
    """
    Extract ZIP file to temporary directory and find all PDFs.

    Returns: (temp_dir_path, list_of_(pdf_path, relative_path)_tuples)
    """
    # Create temporary directory
    temp_dir = Path(tempfile.mkdtemp(prefix="neonatal_reports_"))

    try:
        # Extract ZIP (validate paths to prevent ZIP slip attacks)
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            for member in zip_ref.namelist():
                target = os.path.realpath(os.path.join(temp_dir, member))
                if not target.startswith(os.path.realpath(str(temp_dir))):
                    raise ValueError(f"Illegal path in ZIP: {member}")
            zip_ref.extractall(temp_dir)

        # Find all PDFs recursively
        pdf_files = []
        for pdf_path in temp_dir.rglob("*.pdf"):
            # Calculate relative path from temp_dir
            rel_path = pdf_path.relative_to(temp_dir)
            pdf_files.append((pdf_path, str(rel_path)))

        return temp_dir, pdf_files

    except Exception as e:
        # Clean up on error
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise RuntimeError(f"Error extracting ZIP file: {e}")


def process_batch_pdfs(pdf_files: List[Tuple[Path, str]]) -> Dict:
    """
    Process multiple PDFs and return summary statistics.

    Args:
        pdf_files: List of (absolute_path, relative_path) tuples

    Returns: Dictionary with statistics and results
    """
    results = {
        'total': len(pdf_files),
        'successful': 0,
        'failed': 0,
        'normal': 0,
        'abnormal': 0,
        'abnormal_reports': [],
        'normal_reports': [],
        'failed_reports': []
    }

    for pdf_path, rel_path in pdf_files:
        try:
            analyzer = NeonatalReportAnalyzer(str(pdf_path), rel_path)
            analyzer.extract_text_from_pdf(quiet=True)
            analyzer.parse_patient_info()
            analyzer.parse_biochemical_parameters()
            analyzer.parse_amino_acids()
            analyzer.parse_amino_acid_ratios()
            analyzer.parse_acylcarnitines()
            analyzer.parse_acylcarnitine_ratios()
            analyzer.validate_all_values()

            results['successful'] += 1

            if len(analyzer.abnormalities) > 0:
                results['abnormal'] += 1
                results['abnormal_reports'].append(analyzer.to_dict())
            else:
                results['normal'] += 1
                results['normal_reports'].append(analyzer.to_dict())

        except Exception as e:
            results['failed'] += 1
            results['failed_reports'].append({
                'path': rel_path,
                'error': str(e)
            })

    return results
