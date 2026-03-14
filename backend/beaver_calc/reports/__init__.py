"""
BeaverCalc Studio Report Generation Module
"""

from .generator import (
    ReportGenerator,
    generate_pdf_report,
    generate_docx_report,
)

__all__ = [
    'ReportGenerator',
    'generate_pdf_report',
    'generate_docx_report',
]
