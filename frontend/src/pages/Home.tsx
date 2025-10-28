import { useNavigate } from 'react-router-dom';
import './Home.css';

export default function Home() {
  const navigate = useNavigate();

  return (
    <main className="main-content">
      <div className="container">
        <div className="divisions">
          <div className="division">
            <div className="sample-entry" onClick={() => navigate('/sample-entry')}>
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
                    Click to enter or track samples
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="division">
            <div className="report-handling" onClick={() => navigate('/report-handling')}>
              <div className="section-header">
                <h2 className="section-title">Report Handling</h2>
                <p className="section-description">
                  View, manage, and process sample reports
                </p>
              </div>
              <div className="section-content">
                <div className="placeholder-content">
                  <div className="placeholder-icon">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                  </div>
                  <p className="placeholder-text">
                    Click to upload and manage reports
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
