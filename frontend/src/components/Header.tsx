import { Link, useLocation } from 'react-router-dom';
import './Header.css';

export default function Header() {
  const location = useLocation();

  // Show "Report Analyser" only on the report analyser page
  const isReportAnalyserPage = location.pathname === '/report-analyser';
  const headerTitle = isReportAnalyserPage ? 'Report Analyser' : 'Vijayrekha Life Science';

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <h1 className="header-title">{headerTitle}</h1>
        </div>
        <div className="header-right">
          <Link to="/" className="home-link">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            Home
          </Link>
        </div>
      </div>
    </header>
  );
}
