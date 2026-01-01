import { useState } from 'react';
import type { AnalysisResult } from '../../types/analyzer';
import './BatchReportCard.css';

interface BatchReportCardProps {
  report: AnalysisResult;
}

export default function BatchReportCard({ report }: BatchReportCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { summary, patient_info, abnormalities, file_name } = report;

  return (
    <div className={`batch-report-card ${summary.status}`}>
      <div className="card-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="card-header-left">
          <div className={`status-badge ${summary.status}`}>
            {summary.status === 'normal' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            )}
            {summary.status.toUpperCase()}
          </div>

          <div className="card-title">
            <div className="file-name">{file_name}</div>
            {patient_info.name && (
              <div className="patient-name">{patient_info.name}</div>
            )}
          </div>
        </div>

        <div className="card-header-right">
          <div className="card-stats">
            <span className="stat-item">
              <span className="stat-label">Tests:</span>
              <span className="stat-number">{summary.total_tests}</span>
            </span>
            {summary.abnormal_count > 0 && (
              <span className="stat-item abnormal-count">
                <span className="stat-label">Abnormal:</span>
                <span className="stat-number">{summary.abnormal_count}</span>
              </span>
            )}
          </div>

          <button className="expand-button">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="card-details">
          {/* Patient Info */}
          {Object.keys(patient_info).some(key => patient_info[key as keyof typeof patient_info]) && (
            <div className="detail-section">
              <h4>Patient Information</h4>
              <div className="detail-grid">
                {Object.entries(patient_info).map(([key, value]) =>
                  value ? (
                    <div key={key} className="detail-item">
                      <span className="detail-label">{key.replace('_', ' ').toUpperCase()}:</span>
                      <span className="detail-value">{value}</span>
                    </div>
                  ) : null
                )}
              </div>
            </div>
          )}

          {/* Abnormalities */}
          {abnormalities.length > 0 ? (
            <div className="detail-section">
              <h4>Abnormalities ({abnormalities.length})</h4>
              <div className="abnormalities-list">
                {abnormalities.map((abn, idx) => (
                  <div key={idx} className="abnormality-item-mini">
                    <div className="abn-header">
                      <span className="abn-category">{abn.category}</span>
                      <span className="abn-analyte">{abn.analyte}</span>
                    </div>
                    <div className="abn-details">
                      <span>Value: <strong>{abn.value} {abn.unit}</strong></span>
                      <span>Range: {abn.reference_range} {abn.unit}</span>
                      <span className="abn-reason">{abn.reason}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="detail-section">
              <div className="all-normal">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>All test values are within normal range</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
