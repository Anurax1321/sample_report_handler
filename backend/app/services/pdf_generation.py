# PDF generation service for NBS reports using ReportLab

import os
from typing import Dict, List, Any
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from datetime import datetime

class PDFGenerationError(Exception):
    """Custom exception for PDF generation errors"""
    pass

def generate_nbs_report_pdf(
    processed_data: Dict[str, Any],
    output_path: str,
    date_code: str
) -> str:
    """
    Generate a professional NBS report PDF from processed data

    Args:
        processed_data: Dictionary containing processed report data with compounds and values
        output_path: Directory where PDF should be saved
        date_code: Date code for the report

    Returns:
        Path to the generated PDF file

    Raises:
        PDFGenerationError: If PDF generation fails
    """
    try:
        # Create output directory if it doesn't exist
        os.makedirs(output_path, exist_ok=True)

        # Generate PDF filename
        pdf_filename = f"NBS_Report_{date_code}.pdf"
        pdf_path = os.path.join(output_path, pdf_filename)

        # Create PDF document
        doc = SimpleDocTemplate(
            pdf_path,
            pagesize=letter,
            rightMargin=0.5*inch,
            leftMargin=0.5*inch,
            topMargin=0.75*inch,
            bottomMargin=0.75*inch
        )

        # Container for PDF elements
        elements = []

        # Styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=16,
            textColor=colors.HexColor('#2d3748'),
            spaceAfter=12,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )

        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=12,
            textColor=colors.HexColor('#2d3748'),
            spaceAfter=8,
            spaceBefore=12,
            fontName='Helvetica-Bold'
        )

        normal_style = ParagraphStyle(
            'CustomNormal',
            parent=styles['Normal'],
            fontSize=9,
            textColor=colors.HexColor('#4a5568')
        )

        # Title page
        elements.append(Spacer(1, 1*inch))
        elements.append(Paragraph("Newborn Screening Report", title_style))
        elements.append(Spacer(1, 0.3*inch))

        # Report metadata
        metadata_data = [
            ["Date Code:", date_code],
            ["Report Generated:", datetime.now().strftime("%Y-%m-%d %H:%M:%S")],
            ["Total Samples:", str(processed_data['patient_count'])],
            ["Patient Samples:", str(processed_data['patient_count'] - 4)],
            ["Control Samples:", "4 (2 Control I + 2 Control II)"],
        ]

        metadata_table = Table(metadata_data, colWidths=[2*inch, 3*inch])
        metadata_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#2d3748')),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e0')),
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f7fafc')),
            ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.white, colors.HexColor('#fafafa')]),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))

        elements.append(metadata_table)
        elements.append(PageBreak())

        # Control samples section
        elements.append(Paragraph("Control I Samples", heading_style))
        elements.append(Spacer(1, 0.1*inch))

        control_1_data = _build_sample_table(processed_data, [0, 1])
        if control_1_data:
            control_1_table = _create_data_table(control_1_data, processed_data['compounds'])
            elements.append(control_1_table)

        elements.append(Spacer(1, 0.3*inch))

        elements.append(Paragraph("Control II Samples", heading_style))
        elements.append(Spacer(1, 0.1*inch))

        control_2_data = _build_sample_table(processed_data, [2, 3])
        if control_2_data:
            control_2_table = _create_data_table(control_2_data, processed_data['compounds'])
            elements.append(control_2_table)

        elements.append(PageBreak())

        # Patient samples section - split across multiple pages if needed
        elements.append(Paragraph("Patient Samples", heading_style))
        elements.append(Spacer(1, 0.1*inch))

        # Get all patient indices (from 4 onwards)
        patient_indices = list(range(4, processed_data['patient_count']))

        # Split patients into chunks of 10 per page for readability
        chunk_size = 10
        for i in range(0, len(patient_indices), chunk_size):
            chunk_indices = patient_indices[i:i + chunk_size]
            patient_data = _build_sample_table(processed_data, chunk_indices)

            if patient_data:
                patient_table = _create_data_table(patient_data, processed_data['compounds'])
                elements.append(patient_table)

                # Add page break if not the last chunk
                if i + chunk_size < len(patient_indices):
                    elements.append(PageBreak())
                    elements.append(Paragraph("Patient Samples (continued)", heading_style))
                    elements.append(Spacer(1, 0.1*inch))

        # Build PDF
        doc.build(elements)

        print(f"✓ PDF generated successfully: {pdf_path}")
        return pdf_path

    except Exception as e:
        raise PDFGenerationError(f"Failed to generate PDF: {str(e)}")

def _build_sample_table(processed_data: Dict[str, Any], indices: List[int]) -> List[List[Any]]:
    """Build table data for specific sample indices"""
    table_data = []

    # Header row
    header = ["Sample Name"] + processed_data['compounds'][:10]  # Limit to first 10 compounds for width
    table_data.append(header)

    # Data rows
    for idx in indices:
        if idx < len(processed_data['processed_data']):
            row_data = processed_data['processed_data'][idx]
            row = [row_data['sample_name']]

            for compound in processed_data['compounds'][:10]:
                value_data = row_data['values'].get(compound, {})
                value = value_data.get('value')

                if value is not None:
                    row.append(f"{float(value):.2f}")
                else:
                    row.append("—")

            table_data.append(row)

    return table_data

def _create_data_table(table_data: List[List[Any]], compounds: List[str]) -> Table:
    """Create a styled ReportLab table from data"""

    # Calculate column widths - sample name gets more space
    num_cols = len(table_data[0])
    available_width = 7.0 * inch  # Total available width
    sample_col_width = 1.2 * inch
    data_col_width = (available_width - sample_col_width) / (num_cols - 1)

    col_widths = [sample_col_width] + [data_col_width] * (num_cols - 1)

    table = Table(table_data, colWidths=col_widths, repeatRows=1)

    # Base table style
    table_style = [
        # Header styling
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#d4a574')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),  # Sample names left-aligned
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),  # Values right-aligned

        # Data rows styling
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 7),
        ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor('#2d3748')),

        # Grid and padding
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e0')),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),

        # Alternating row backgrounds
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#fafafa')]),

        # Vertical alignment
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]

    table.setStyle(TableStyle(table_style))

    return table
