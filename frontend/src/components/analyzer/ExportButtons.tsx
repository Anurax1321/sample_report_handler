import { useState } from 'react';
import type { AnalysisResult } from '../../types/analyzer';
import { exportToExcel, exportToHTML } from '../../services/analyzerApi';
import './ExportButtons.css';

interface ExportButtonsProps {
  result: AnalysisResult;
}

export default function ExportButtons({ result }: ExportButtonsProps) {
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingHTML, setIsExportingHTML] = useState(false);

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleExcelExport = async () => {
    setIsExportingExcel(true);

    try {
      const blob = await exportToExcel(result);
      const fileName = result.file_name.replace('.pdf', '') + '_analysis.xlsx';
      downloadBlob(blob, fileName);
    } catch (error: any) {
      console.error('Excel export error:', error);
      alert('Failed to export to Excel. Please try again.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleHTMLExport = async () => {
    setIsExportingHTML(true);

    try {
      const blob = await exportToHTML(result);
      const fileName = result.file_name.replace('.pdf', '') + '_analysis.html';
      downloadBlob(blob, fileName);
    } catch (error: any) {
      console.error('HTML export error:', error);
      alert('Failed to export to HTML. Please try again.');
    } finally {
      setIsExportingHTML(false);
    }
  };

  return (
    <div className="export-buttons">
      <h3 className="export-title">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        Export Results
      </h3>

      <div className="export-button-group">
        <button
          className="export-button excel"
          onClick={handleExcelExport}
          disabled={isExportingExcel}
        >
          {isExportingExcel ? (
            <>
              <div className="button-spinner"></div>
              Exporting...
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              Export to Excel
            </>
          )}
        </button>

        <button
          className="export-button html"
          onClick={handleHTMLExport}
          disabled={isExportingHTML}
        >
          {isExportingHTML ? (
            <>
              <div className="button-spinner"></div>
              Exporting...
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="16 18 22 12 16 6"></polyline>
                <polyline points="8 6 2 12 8 18"></polyline>
              </svg>
              Export to HTML
            </>
          )}
        </button>
      </div>

      <p className="export-description">
        Download comprehensive analysis report in your preferred format
      </p>
    </div>
  );
}
