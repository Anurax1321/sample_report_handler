import { useNavigate } from 'react-router-dom';
import './SampleEntryChoice.css';

export default function SampleEntryChoice() {
  const navigate = useNavigate();

  return (
    <main className="main-content">
      <div className="container">
        <div className="page-title-section">
          <h1 className="page-title">Sample Management</h1>
        </div>
        <div className="divisions">
          <div className="division">
            <div className="choice-card green-light" onClick={() => navigate('/sample-entry/form')}>
              <div className="section-header">
                <h2 className="section-title">New Sample Entry</h2>
                <p className="section-description">
                  Register a new sample submission
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
                    Click to add a new sample
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="division">
            <div className="choice-card green-dark" onClick={() => navigate('/sample-entry/tracking')}>
              <div className="section-header">
                <h2 className="section-title">Sample Tracking</h2>
                <p className="section-description">
                  Track and monitor existing samples
                </p>
              </div>
              <div className="section-content">
                <div className="placeholder-content">
                  <div className="placeholder-icon">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8"></circle>
                      <path d="m21 21-4.35-4.35"></path>
                      <path d="M11 8v6l4 2"></path>
                    </svg>
                  </div>
                  <p className="placeholder-text">
                    Click to track sample status
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
