import { useState } from 'react';
import type { BatchAnalysisResponse, AnalysisResult } from '../../types/analyzer';
import BatchReportCard from './BatchReportCard';
import './BatchDashboard.css';

interface BatchDashboardProps {
  batchResult: BatchAnalysisResponse;
  onReset: () => void;
  uploadedZipFile: File | null;
}

export default function BatchDashboard({ batchResult, onReset, uploadedZipFile }: BatchDashboardProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'abnormal' | 'normal' | 'failed'>('abnormal');
  const [searchTerm, setSearchTerm] = useState('');

  const allReports = [
    ...batchResult.abnormal_reports,
    ...batchResult.normal_reports,
  ];

  const getFilteredReports = (): AnalysisResult[] => {
    let reports: AnalysisResult[] = [];

    switch (activeTab) {
      case 'abnormal':
        reports = batchResult.abnormal_reports;
        break;
      case 'normal':
        reports = batchResult.normal_reports;
        break;
      case 'all':
        reports = allReports;
        break;
      default:
        reports = allReports;
    }

    if (searchTerm) {
      reports = reports.filter(r =>
        r.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.patient_info.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return reports;
  };

  const filteredReports = getFilteredReports();

  return (
    <div className="batch-dashboard">
      {/* Sidebar with Filter Stats */}
      <div className="batch-sidebar">
        <div className="sidebar-header">
          <h3>Filters</h3>
        </div>

        <div className="sidebar-filters">
          {/* Abnormal */}
          <button
            className={`sidebar-stat-card abnormal ${activeTab === 'abnormal' ? 'active' : ''}`}
            onClick={() => setActiveTab('abnormal')}
          >
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-label">Abnormal</div>
              <div className="stat-value">{batchResult.abnormal}</div>
            </div>
          </button>

          {/* Normal */}
          <button
            className={`sidebar-stat-card normal ${activeTab === 'normal' ? 'active' : ''}`}
            onClick={() => setActiveTab('normal')}
          >
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-label">Normal</div>
              <div className="stat-value">{batchResult.normal}</div>
            </div>
          </button>

          {/* Total Files */}
          <button
            className={`sidebar-stat-card total ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-label">Total Files</div>
              <div className="stat-value">{batchResult.total}</div>
            </div>
          </button>

          {/* Unprocessed (if any) */}
          {batchResult.failed > 0 && (
            <button
              className={`sidebar-stat-card failed ${activeTab === 'failed' ? 'active' : ''}`}
              onClick={() => setActiveTab('failed')}
            >
              <div className="stat-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="15" y1="9" x2="9" y2="15"></line>
                  <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-label">Unprocessed</div>
                <div className="stat-value">{batchResult.failed}</div>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="batch-main-content">
        {/* Search Bar */}
        <div className="batch-content-header">
          <input
            type="text"
            className="batch-search"
            placeholder="Search by file name or patient..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Unprocessed Reports */}
        {activeTab === 'failed' && batchResult.failed_reports.length > 0 && (
          <div className="failed-reports-section">
            <h3>Unprocessed Reports</h3>
            {batchResult.failed_reports.map((failed, idx) => (
              <div key={idx} className="failed-report-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="15" y1="9" x2="9" y2="15"></line>
                  <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
                <div>
                  <div className="failed-file-name">{failed.path}</div>
                  <div className="failed-error">{failed.error}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Report Cards */}
        {activeTab !== 'failed' && (
          <div className="batch-reports-grid">
            {filteredReports.length === 0 ? (
              <div className="no-results">
                <p>No reports found matching your filters</p>
              </div>
            ) : (
              filteredReports.map((report, idx) => (
                <BatchReportCard key={idx} report={report} uploadedZipFile={uploadedZipFile} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
