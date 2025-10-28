import './SampleEntry.css';

export default function SampleEntry() {
  return (
    <section className="sample-entry">
      <div className="section-header">
        <h2 className="section-title">Sample Entry</h2>
        <p className="section-description">
          Register and track new sample submissions
        </p>
      </div>
      <div className="section-content">
        <div className="placeholder-content">
          <div className="placeholder-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="12" y1="18" x2="12" y2="12"></line>
              <line x1="9" y1="15" x2="15" y2="15"></line>
            </svg>
          </div>
          <p className="placeholder-text">
            Sample entry form will appear here
          </p>
        </div>
      </div>
    </section>
  );
}
