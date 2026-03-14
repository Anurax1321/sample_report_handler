import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchUsers, registerUser, toggleUserActive } from '../lib/auth';
import type { UserInfo } from '../lib/auth';
import './UserManagement.css';

export default function UserManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // New user form
  const [showForm, setShowForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Redirect non-admins
  useEffect(() => {
    if (user && !user.is_admin) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const loadUsers = async () => {
    try {
      const data = await fetchUsers();
      setUsers(data);
      setError('');
    } catch {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!newUsername.trim() || !newPassword.trim()) {
      setFormError('Username and password are required');
      return;
    }
    if (newPassword.length < 4) {
      setFormError('Password must be at least 4 characters');
      return;
    }

    setSubmitting(true);
    try {
      await registerUser(newUsername.trim(), newPassword);
      setNewUsername('');
      setNewPassword('');
      setShowForm(false);
      await loadUsers();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setFormError(detail || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (userId: number) => {
    try {
      const updated = await toggleUserActive(userId);
      setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      alert(detail || 'Failed to update user');
    }
  };

  if (!user?.is_admin) {
    return null;
  }

  if (loading) {
    return <div className="um-page"><p className="um-loading">Loading users...</p></div>;
  }

  return (
    <div className="um-page">
      <div className="um-container">
        <div className="um-header">
          <h2 className="um-title">User Management</h2>
          <button
            className="um-add-btn"
            onClick={() => { setShowForm(!showForm); setFormError(''); }}
          >
            {showForm ? 'Cancel' : '+ Add User'}
          </button>
        </div>

        {error && <div className="um-error">{error}</div>}

        {showForm && (
          <form className="um-form" onSubmit={handleCreateUser}>
            <div className="um-form-row">
              <div className="um-field">
                <label>Username</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  placeholder="Enter username"
                  autoFocus
                />
              </div>
              <div className="um-field">
                <label>Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min 4 characters"
                />
              </div>
              <button type="submit" className="um-create-btn" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create'}
              </button>
            </div>
            {formError && <div className="um-form-error">{formError}</div>}
          </form>
        )}

        <div className="um-table-wrap">
          <table className="um-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className={!u.is_active ? 'um-inactive-row' : ''}>
                  <td>{u.id}</td>
                  <td className="um-username-cell">{u.username}</td>
                  <td>
                    <span className={`um-badge ${u.is_admin ? 'um-badge-admin' : 'um-badge-user'}`}>
                      {u.is_admin ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td>
                    <span className={`um-badge ${u.is_active ? 'um-badge-active' : 'um-badge-inactive'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    <button
                      className={`um-toggle-btn ${u.is_active ? 'um-deactivate' : 'um-activate'}`}
                      onClick={() => handleToggleActive(u.id)}
                    >
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={6} className="um-empty">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
