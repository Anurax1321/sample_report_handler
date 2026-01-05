import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProcessedData, getReport } from '../lib/reportApi';
import type { ProcessedReportData, Report } from '../lib/reportApi';
import './ReportReview.css';

export default function ReportReview() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();

  const [report, setReport] = useState<Report | null>(null);
  const [processedData, setProcessedData] = useState<ProcessedReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        // Fetch report metadata and processed data in parallel
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
          </div>
        </div>
      </div>

      <div className="review-content">
        <div className="data-preview">
          <h2>Processed Data Preview</h2>
          <p className="preview-description">
            This is a basic table view of your processed data. The next phase will add
            Excel-like editing capabilities and color coding.
          </p>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="sticky-col">Sample Name</th>
                  <th className="sticky-col">Type</th>
                  {processedData.compounds.map((compound) => (
                    <th key={compound}>{compound}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {processedData.processed_data.map((row, idx) => {
                  const rowType = row.is_control_1
                    ? 'Control I'
                    : row.is_control_2
                    ? 'Control II'
                    : 'Patient';

                  return (
                    <tr key={idx} className={`row-${rowType.toLowerCase().replace(' ', '-')}`}>
                      <td className="sticky-col sample-name">{row.sample_name}</td>
                      <td className="sticky-col row-type">{rowType}</td>
                      {processedData.compounds.map((compound) => {
                        const compoundData = row.values[compound];
                        const value = compoundData?.value;
                        const color = compoundData?.color || 'none';

                        return (
                          <td
                            key={compound}
                            className={`value-cell color-${color}`}
                          >
                            {value !== null && value !== undefined ? value.toFixed(2) : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="color-legend">
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
            </div>
          </div>
        </div>

        <div className="review-actions">
          <button onClick={handleGoBack} className="secondary-button">
            Cancel & Go Back
          </button>
          <button className="primary-button" disabled>
            Approve & Generate PDF (Phase 6)
          </button>
        </div>
      </div>
    </div>
  );
}
