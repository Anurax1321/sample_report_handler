import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { changePassword } from '../lib/auth';
import './Header.css';

export default function Header() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const isHome = location.pathname === '/' || location.pathname === '/home';

  // Profile dropdown
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Change password modal
  const [showPwModal, setShowPwModal] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Close dropdown on route change
  useEffect(() => { setDropdownOpen(false); }, [location.pathname]);

  const getHeaderTitle = () => {
    const path = location.pathname;
    if (path === '/' || path === '/home') return 'Vijayrekha Life Sciences';
    if (path.startsWith('/report-handling') || path.startsWith('/report-review')) return 'Report Handling';
    if (path.startsWith('/report-analyser')) return 'Report Analyser';
    if (path === '/sample-entry/form') return 'New Sample Entry';
    if (path === '/sample-entry/tracking') return 'Sample Tracking';
    if (path.startsWith('/sample-entry')) return 'Sample Management';
    if (path === '/users') return 'User Management';
    return 'Vijayrekha Life Sciences';
  };

  const getInitial = () => {
    return user?.username?.charAt(0).toUpperCase() || '?';
  };

  const openPwModal = () => {
    setDropdownOpen(false);
    setCurrentPw('');
    setNewPw('');
    setConfirmPw('');
    setPwError('');
    setPwSuccess('');
    setShowPwModal(true);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');

    if (newPw.length < 4) {
      setPwError('New password must be at least 4 characters');
      return;
    }
    if (newPw !== confirmPw) {
      setPwError('New passwords do not match');
      return;
    }

    setPwLoading(true);
    try {
      await changePassword(currentPw, newPw);
      setPwSuccess('Password changed successfully');
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      setTimeout(() => setShowPwModal(false), 1200);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setPwError(detail || 'Failed to change password');
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <>
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <h1 className="header-title">{getHeaderTitle()}</h1>
          </div>
          <div className="header-right">
            {!isHome && (
              <Link to="/" className="home-link">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                Home
              </Link>
            )}
            {user && (
              <div className="profile-wrapper" ref={dropdownRef}>
                <button
                  type="button"
                  className="profile-avatar"
                  onClick={() => setDropdownOpen(prev => !prev)}
                  title={user.username}
                >
                  {getInitial()}
                </button>

                {dropdownOpen && (
                  <div className="profile-dropdown">
                    <div className="profile-dropdown-header">
                      <div className="profile-dropdown-avatar">{getInitial()}</div>
                      <div className="profile-dropdown-info">
                        <span className="profile-dropdown-name">{user.username}</span>
                        <span className="profile-dropdown-role">Signed in</span>
                      </div>
                    </div>
                    <div className="profile-dropdown-divider" />
                    <Link to="/users" className="profile-dropdown-item" onClick={() => setDropdownOpen(false)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                      </svg>
                      Manage Users
                    </Link>
                    <button type="button" className="profile-dropdown-item" onClick={openPwModal}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                      </svg>
                      Change Password
                    </button>
                    <div className="profile-dropdown-divider" />
                    <button type="button" className="profile-dropdown-item profile-dropdown-signout" onClick={() => { setDropdownOpen(false); logout(); }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                      </svg>
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {showPwModal && (
        <div className="pw-modal-backdrop" onClick={() => setShowPwModal(false)}>
          <div className="pw-modal" onClick={e => e.stopPropagation()}>
            <div className="pw-modal-header">
              <h3>Change Password</h3>
              <button className="pw-modal-close" onClick={() => setShowPwModal(false)}>&times;</button>
            </div>
            <form className="pw-modal-form" onSubmit={handleChangePassword}>
              <div className="pw-field">
                <label>Current Password</label>
                <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} autoFocus />
              </div>
              <div className="pw-field">
                <label>New Password</label>
                <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Min 4 characters" />
              </div>
              <div className="pw-field">
                <label>Confirm New Password</label>
                <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} />
              </div>
              {pwError && <div className="pw-error">{pwError}</div>}
              {pwSuccess && <div className="pw-success">{pwSuccess}</div>}
              <button type="submit" className="pw-submit" disabled={pwLoading}>
                {pwLoading ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
