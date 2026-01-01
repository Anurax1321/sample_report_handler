import './PageLayout.css';

export default function ReportAnalyser() {
  return (
    <main className="page-layout">
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Report Analyser</h1>
          <p className="page-description">
            Advanced analytics and visualization for NBS report data
          </p>
        </div>
        <div className="page-content">
          <div className="placeholder-container">
            <div className="placeholder-icon-large">
              <svg width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="7.5 4.21 12 6.81 16.5 4.21"></polyline>
                <polyline points="7.5 19.79 7.5 14.6 3 12"></polyline>
                <polyline points="21 12 16.5 14.6 16.5 19.79"></polyline>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
            </div>
            <h2 className="placeholder-title">Report Analyser Coming Soon</h2>
            <p className="placeholder-message">
              This module will integrate with your separate report analyser program to provide:
            </p>
            <ul className="feature-list">
              <li>Interactive data visualization and charts</li>
              <li>Statistical analysis of NBS test results</li>
              <li>Trend analysis across multiple reports</li>
              <li>Export capabilities for analyzed data</li>
              <li>Custom filtering and data exploration tools</li>
            </ul>
            <div className="info-box">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <span>Integration with external analyser program will be configured in the next phase</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
