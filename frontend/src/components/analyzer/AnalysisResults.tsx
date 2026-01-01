import type { AnalysisResult } from '../../types/analyzer';
import PatientInfoCard from './PatientInfoCard';
import AbnormalityTable from './AbnormalityTable';
import ExportButtons from './ExportButtons';
import './AnalysisResults.css';

interface AnalysisResultsProps {
  result: AnalysisResult;
}

export default function AnalysisResults({ result }: AnalysisResultsProps) {
  const { summary, patient_info, abnormalities } = result;

  return (
    <div className="analysis-results">
      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="card-icon total">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 11l3 3L22 4"></path>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
            </svg>
          </div>
          <div className="card-content">
            <div className="card-value">{summary.total_tests}</div>
            <div className="card-label">Total Tests</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon normal">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <div className="card-content">
            <div className="card-value">{summary.normal_count}</div>
            <div className="card-label">Normal</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon abnormal">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <div className="card-content">
            <div className="card-value">{summary.abnormal_count}</div>
            <div className="card-label">Abnormal</div>
          </div>
        </div>

        <div className={`summary-card status ${summary.status}`}>
          <div className={`card-icon ${summary.status}`}>
            {summary.status === 'normal' ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            )}
          </div>
          <div className="card-content">
            <div className="card-value">{summary.status.toUpperCase()}</div>
            <div className="card-label">Status</div>
          </div>
        </div>
      </div>

      {/* Patient Information */}
      <PatientInfoCard patientInfo={patient_info} fileName={result.file_name} />

      {/* Abnormalities */}
      {abnormalities.length > 0 ? (
        <AbnormalityTable abnormalities={abnormalities} />
      ) : (
        <div className="no-abnormalities">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <h3>All Clear!</h3>
          <p>No abnormalities detected. All test values are within normal range.</p>
        </div>
      )}

      {/* Export Buttons */}
      <ExportButtons result={result} />
    </div>
  );
}
