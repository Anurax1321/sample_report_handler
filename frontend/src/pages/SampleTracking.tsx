import './PageLayout.css';

export default function SampleTracking() {
  return (
    <div className="page-layout">
      <div className="page-header">
        <h1 className="page-title">Sample Tracking</h1>
      </div>
      <div className="page-content">
        <div className="content-card">
          <div className="placeholder-message">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
              <path d="M11 8v6l4 2"></path>
            </svg>
            <h2>Sample Tracking System</h2>
            <p>Tracking interface will be implemented here</p>
          </div>
        </div>
      </div>
    </div>
  );
}
