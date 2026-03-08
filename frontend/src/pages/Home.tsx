import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Sample } from '../lib/sampleApi';
import SampleTracking from './SampleTracking';
import SampleEntryForm from './SampleEntryForm';
import ReportHandlingModal from '../components/ReportHandlingModal';
import ReportAnalyserModal from '../components/ReportAnalyserModal';
import './Home.css';

export default function Home() {
  const navigate = useNavigate();
  const [allSamples, setAllSamples] = useState<Sample[]>([]);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showAnalyserModal, setShowAnalyserModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleSamplesChange = useCallback((samples: Sample[], _filtered: Sample[]) => {
    setAllSamples(samples);
  }, []);

  const stats = useMemo(() => ({
    total: allSamples.length,
    received: allSamples.filter(s => s.status === 'received').length,
    processing: allSamples.filter(s => s.status === 'processing').length,
    completed: allSamples.filter(s => s.status === 'completed').length,
    rejected: allSamples.filter(s => s.status === 'rejected').length,
  }), [allSamples]);

  return (
    <main className="dashboard">
      <div className="dashboard-stats">
        <div className="stat-card stat-total">
          <span className="stat-count">{stats.total}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="stat-card stat-received">
          <span className="stat-count">{stats.received}</span>
          <span className="stat-label">Received</span>
        </div>
        <div className="stat-card stat-processing">
          <span className="stat-count">{stats.processing}</span>
          <span className="stat-label">Processing</span>
        </div>
        <div className="stat-card stat-completed">
          <span className="stat-count">{stats.completed}</span>
          <span className="stat-label">Completed</span>
        </div>
        <div className="stat-card stat-rejected">
          <span className="stat-count">{stats.rejected}</span>
          <span className="stat-label">Rejected</span>
        </div>
      </div>

      <div className="dashboard-main">
        <div className="dashboard-sidebar">
          <div className="report-handling" onClick={() => setShowReportModal(true)}>
            <div className="section-header">
              <h2 className="section-title">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                Report Handling
              </h2>
              <p className="section-description">
                View, manage, and process sample reports
              </p>
            </div>
          </div>

          <div className="report-analyser" onClick={() => setShowAnalyserModal(true)}>
            <div className="section-header">
              <h2 className="section-title">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                  <polyline points="7.5 4.21 12 6.81 16.5 4.21"></polyline>
                  <polyline points="7.5 19.79 7.5 14.6 3 12"></polyline>
                  <polyline points="21 12 16.5 14.6 16.5 19.79"></polyline>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                  <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
                Report Analyser
              </h2>
              <p className="section-description">
                Analyze and visualize report data with advanced insights
              </p>
            </div>
          </div>

        </div>

        <div className="dashboard-tracking">
          <SampleTracking embedded onSamplesChange={handleSamplesChange} refreshTrigger={refreshTrigger} onNewSample={() => setShowEntryModal(true)} />
        </div>
      </div>

      {showReportModal && (
        <ReportHandlingModal
          onClose={() => setShowReportModal(false)}
          onSuccess={() => setRefreshTrigger(t => t + 1)}
        />
      )}

      {showAnalyserModal && (
        <ReportAnalyserModal onClose={() => setShowAnalyserModal(false)} />
      )}

      {showEntryModal && (
        <div className="modal-backdrop" onClick={() => setShowEntryModal(false)}>
          <div className="entry-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowEntryModal(false)}>&times;</button>
            <SampleEntryForm
              embedded
              onClose={() => setShowEntryModal(false)}
              onSuccess={() => setRefreshTrigger(t => t + 1)}
            />
          </div>
        </div>
      )}
    </main>
  );
}
