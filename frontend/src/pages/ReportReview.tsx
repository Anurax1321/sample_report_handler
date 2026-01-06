import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import type { ColDef, CellStyle } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { getProcessedData, getReport, approveReport, downloadPDF } from '../lib/reportApi';
import type { ProcessedReportData, Report } from '../lib/reportApi';
import './ReportReview.css';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

export default function ReportReview() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();

  const [report, setReport] = useState<Report | null>(null);
  const [processedData, setProcessedData] = useState<ProcessedReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editedCells, setEditedCells] = useState<Set<string>>(new Set());
  const [rowData, setRowData] = useState<any[]>([]);
  const [approving, setApproving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    if (!reportId) {
      setError('No report ID provided');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [reportData, processedReportData] = await Promise.all([
          getReport(parseInt(reportId)),
          getProcessedData(parseInt(reportId))
        ]);

        setReport(reportData);
        setProcessedData(processedReportData);
      } catch (err: any) {
        console.error('Error fetching report data:', err);
        setError(err.response?.data?.detail || err.message || 'Failed to load report data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [reportId]);

  // Initialize row data when processedData changes
  useEffect(() => {
    if (!processedData) return;

    const data = processedData.processed_data.map((row, idx) => {
      const rowType = row.is_control_1
        ? 'Control I'
        : row.is_control_2
        ? 'Control II'
        : 'Patient';

      const rowObj: any = {
        id: idx,
        sampleName: row.sample_name,
        rowType: rowType,
        isControl1: row.is_control_1,
        isControl2: row.is_control_2,
      };

      // Add all compound values with their metadata
      processedData.compounds.forEach((compound) => {
        const compoundData = row.values[compound];
        rowObj[compound] = compoundData?.value;
        rowObj[`${compound}_color`] = compoundData?.color || 'none';
        rowObj[`${compound}_original`] = compoundData?.value; // Store original value
      });

      return rowObj;
    });

    setRowData(data);
  }, [processedData]);

  // Function to recalculate color based on new value
  const getColorForValue = useCallback((compound: string, value: number | null, isControl1: boolean, isControl2: boolean, isRatio: boolean = false) => {
    if (!processedData || value === null || value === undefined) return 'none';

    let ranges;
    // Check if this is a ratio field
    if (isRatio) {
      ranges = processedData.reference_ranges.ratios?.[compound];
    } else if (isControl1) {
      ranges = processedData.reference_ranges.control_1[compound];
    } else if (isControl2) {
      ranges = processedData.reference_ranges.control_2[compound];
    } else {
      ranges = processedData.reference_ranges.patient[compound];
    }

    if (!ranges) return 'none';

    const [min, max] = ranges;

    if (value >= min && value <= max) {
      return 'green'; // Within range
    } else {
      // Check if critically out of range (>50% beyond limits)
      const lowerCritical = min * 0.5;
      const upperCritical = max * 1.5;
      if (value < lowerCritical || value > upperCritical) {
        return 'red'; // Critical
      }
      return 'yellow'; // Out of range but not critical
    }
  }, [processedData]);

  // Handle cell value changes
  const onCellEditingStopped = useCallback((event: any) => {
    const { data, colDef, newValue, oldValue } = event;
    const field = colDef.field;

    if (!field || field === 'sampleName' || field === 'rowType') return;

    // Only process if value actually changed
    if (newValue === oldValue) return;

    const numValue = parseFloat(newValue);
    if (isNaN(numValue)) {
      // Reset to old value if invalid
      event.api.getRowNode(data.id)?.setDataValue(field, oldValue);
      return;
    }

    // Recalculate color
    const newColor = getColorForValue(field, numValue, data.isControl1, data.isControl2);

    // Update the row data with new value and color
    const updatedData = [...rowData];
    const rowIndex = updatedData.findIndex(row => row.id === data.id);
    if (rowIndex !== -1) {
      updatedData[rowIndex][field] = numValue;
      updatedData[rowIndex][`${field}_color`] = newColor;
      setRowData(updatedData);
    }

    // Mark cell as edited
    const cellKey = `${data.id}-${field}`;
    setEditedCells(prev => new Set(prev).add(cellKey));

    // Refresh the cell to show new color
    event.api.refreshCells({
      rowNodes: [event.node!],
      columns: [field],
      force: true,
    });
  }, [rowData, getColorForValue]);

  // Reset all changes
  const handleResetChanges = useCallback(() => {
    if (!processedData) return;

    const originalData = processedData.processed_data.map((row, idx) => {
      const rowType = row.is_control_1
        ? 'Control I'
        : row.is_control_2
        ? 'Control II'
        : 'Patient';

      const rowObj: any = {
        id: idx,
        sampleName: row.sample_name,
        rowType: rowType,
        isControl1: row.is_control_1,
        isControl2: row.is_control_2,
      };

      processedData.compounds.forEach((compound) => {
        const compoundData = row.values[compound];
        rowObj[compound] = compoundData?.value;
        rowObj[`${compound}_color`] = compoundData?.color || 'none';
        rowObj[`${compound}_original`] = compoundData?.value;
      });

      return rowObj;
    });

    setRowData(originalData);
    setEditedCells(new Set());
  }, [processedData]);

  // Collect edited cell data
  const getEditedData = useCallback(() => {
    const editedData: Record<string, number> = {};

    editedCells.forEach(cellKey => {
      const [rowIdStr, compound] = cellKey.split('-');
      const rowId = parseInt(rowIdStr);
      const row = rowData.find(r => r.id === rowId);

      if (row && row[compound] !== undefined) {
        editedData[cellKey] = row[compound];
      }
    });

    return editedData;
  }, [editedCells, rowData]);

  // Handle approval
  const handleApprove = useCallback(async () => {
    if (!reportId || !processedData) return;

    try {
      setApproving(true);
      setShowConfirmDialog(false);

      // Get edited data
      const editedData = getEditedData();

      // Send to backend and generate PDF
      const result = await approveReport(parseInt(reportId), editedData);

      // Download the generated PDF
      const pdfFilename = result.pdf_filename || `NBS_Report_${processedData.date_code}.pdf`;
      await downloadPDF(parseInt(reportId), pdfFilename);

      // Show success message
      alert(`Report approved successfully! PDF "${pdfFilename}" has been downloaded.`);

      // Navigate back to upload page
      navigate('/report-handling');

    } catch (err: any) {
      console.error('Error approving report:', err);
      alert(err.response?.data?.detail || err.message || 'Failed to approve report and generate PDF');
    } finally {
      setApproving(false);
    }
  }, [reportId, processedData, getEditedData, navigate]);

  // Show confirmation dialog
  const handleApproveClick = () => {
    setShowConfirmDialog(true);
  };

  // Column definitions
  const columnDefs = useMemo<ColDef[]>(() => {
    if (!processedData) return [];

    const getCellStyle = (params: any): CellStyle => {
      const field = params.colDef.field;
      if (!field) return {};

      const colorKey = `${field}_color`;
      const color = params.data[colorKey];
      const cellKey = `${params.data.id}-${field}`;
      const isEdited = editedCells.has(cellKey);

      const baseStyle: CellStyle = {
        textAlign: 'right',
        fontFamily: 'monospace',
      };

      // Add border for edited cells
      if (isEdited) {
        baseStyle.border = '2px solid #d4a574';
        baseStyle.position = 'relative';
      }

      switch (color) {
        case 'green':
          return { ...baseStyle, backgroundColor: '#d4edda', color: '#155724' };
        case 'yellow':
          return { ...baseStyle, backgroundColor: '#fff3cd', color: '#856404' };
        case 'red':
          return { ...baseStyle, backgroundColor: '#f8d7da', color: '#721c24', fontWeight: '600' };
        default:
          return baseStyle;
      }
    };

    const cols: ColDef[] = [
      {
        field: 'sampleName',
        headerName: 'Sample Name',
        pinned: 'left',
        width: 150,
        cellStyle: { fontWeight: '500' },
        editable: false,
      },
      {
        field: 'rowType',
        headerName: 'Type',
        pinned: 'left',
        width: 100,
        cellStyle: { fontSize: '0.85rem', color: '#718096' },
        editable: false,
      },
    ];

    // Add compound columns
    processedData.compounds.forEach((compound) => {
      cols.push({
        field: compound,
        headerName: compound,
        width: 100,
        type: 'numericColumn',
        editable: true,
        cellStyle: getCellStyle,
        valueFormatter: (params) => {
          if (params.value === null || params.value === undefined) return '—';
          return parseFloat(params.value).toFixed(2);
        },
        valueSetter: (params) => {
          const newValue = parseFloat(params.newValue);
          if (!isNaN(newValue)) {
            params.data[params.colDef.field!] = newValue;
            return true;
          }
          return false;
        },
      });
    });

    return cols;
  }, [processedData, editedCells]);

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    filter: true,
    resizable: true,
  }), []);

  const handleGoBack = () => {
    navigate('/report-handling');
  };

  if (loading) {
    return (
      <div className="report-review">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading report data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="report-review">
        <div className="error-container">
          <h2>Error Loading Report</h2>
          <p className="error-message">{error}</p>
          <button onClick={handleGoBack} className="back-button">
            Go Back to Upload
          </button>
        </div>
      </div>
    );
  }

  if (!processedData || !report) {
    return (
      <div className="report-review">
        <div className="error-container">
          <h2>No Data Available</h2>
          <p>Report data could not be loaded.</p>
          <button onClick={handleGoBack} className="back-button">
            Go Back to Upload
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="report-review">
      <div className="review-header">
        <div className="header-info">
          <h1>Report Review</h1>
          <div className="report-metadata">
            <span className="metadata-item">
              <strong>Report ID:</strong> {report.id}
            </span>
            <span className="metadata-item">
              <strong>Date Code:</strong> {processedData.date_code}
            </span>
            <span className="metadata-item">
              <strong>Uploaded By:</strong> {report.uploaded_by}
            </span>
            <span className="metadata-item">
              <strong>Patient Count:</strong> {processedData.patient_count - 4} (+ 4 controls)
            </span>
            {editedCells.size > 0 && (
              <span className="metadata-item edited-badge">
                <strong>Edited Cells:</strong> {editedCells.size}
              </span>
            )}
          </div>

          <div className="color-legend" style={{ marginTop: '1.5rem' }}>
            <h3>Color Legend:</h3>
            <div className="legend-items">
              <div className="legend-item">
                <span className="legend-color color-green"></span>
                <span>Normal Range</span>
              </div>
              <div className="legend-item">
                <span className="legend-color color-yellow"></span>
                <span>Out of Range</span>
              </div>
              <div className="legend-item">
                <span className="legend-color color-red"></span>
                <span>Critical</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{border: '2px solid #d4a574', background: 'white', width: '38px'}}></span>
                <span>Edited Cell</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="review-content">
        <div className="data-preview">
          <div className="grid-header">
            <div>
              <h2>Editable Data Grid with Real-Time Validation</h2>
              <p className="preview-description">
                Click any cell to edit. Color updates automatically based on reference ranges.
                Edited cells are highlighted with a border.
              </p>
            </div>
            {editedCells.size > 0 && (
              <button onClick={handleResetChanges} className="reset-button">
                Reset All Changes ({editedCells.size})
              </button>
            )}
          </div>

          <div className="ag-grid-container ag-theme-alpine">
            <AgGridReact
              rowData={rowData}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              theme="legacy"
              domLayout="normal"
              headerHeight={40}
              rowHeight={35}
              animateRows={true}
              enableCellTextSelection={true}
              onCellEditingStopped={onCellEditingStopped}
              singleClickEdit={false}
              stopEditingWhenCellsLoseFocus={true}
            />
          </div>
        </div>

        <div className="review-actions">
          <button onClick={handleGoBack} className="secondary-button" disabled={approving}>
            Cancel & Go Back
          </button>
          <button
            onClick={handleApproveClick}
            className="primary-button"
            disabled={approving}
          >
            {approving ? 'Generating PDF...' : 'Approve & Generate PDF'}
          </button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="modal-overlay" onClick={() => setShowConfirmDialog(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Confirm Approval</h2>
            <p>
              Are you sure you want to approve this report?
              {editedCells.size > 0 && (
                <span className="warning-text">
                  <br /><br />
                  You have made {editedCells.size} edit{editedCells.size !== 1 ? 's' : ''} to the data.
                  These changes will be saved.
                </span>
              )}
            </p>
            <div className="modal-actions">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="secondary-button"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                className="primary-button"
              >
                Yes, Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
