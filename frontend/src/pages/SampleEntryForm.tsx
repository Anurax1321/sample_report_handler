import './PageLayout.css';

export default function SampleEntryForm() {
  return (
    <div className="page-layout">
      <div className="page-header">
        <h1 className="page-title">New Sample Entry</h1>
      </div>
      <div className="page-content">
        <div className="content-card">
          <div className="placeholder-message">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="12" y1="18" x2="12" y2="12"></line>
              <line x1="9" y1="15" x2="15" y2="15"></line>
            </svg>
            <h2>Sample Entry Form</h2>
            <p>Form will be implemented here</p>
          </div>
        </div>
      </div>
    </div>
  );
}
