import { useState, useEffect } from 'react';
import { getSamples, updateSampleStatus, deleteSample } from '../lib/sampleApi';
import type { Sample } from '../lib/sampleApi';
import './SampleTracking.css';

export default function SampleTracking() {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [filteredSamples, setFilteredSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [testTypeFilter, setTestTypeFilter] = useState<string>('all');

  useEffect(() => {
    fetchSamples();
  }, []);

  useEffect(() => {
    filterSamples();
  }, [samples, searchTerm, statusFilter, priorityFilter, testTypeFilter]);

  const fetchSamples = async () => {
    try {
      setLoading(true);
      const data = await getSamples();
      setSamples(data);
    } catch (error) {
      console.error('Error fetching samples:', error);
      alert('Failed to load samples');
    } finally {
      setLoading(false);
    }
  };

  const filterSamples = () => {
    let filtered = [...samples];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(sample =>
        sample.sample_code.toLowerCase().includes(term) ||
        sample.patient_id.toLowerCase().includes(term) ||
        sample.from_hospital.toLowerCase().includes(term) ||
        sample.age_gender.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(sample => sample.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(sample => sample.priority === priorityFilter);
    }

    // Test type filter
    if (testTypeFilter !== 'all') {
      filtered = filtered.filter(sample => sample.test_type === testTypeFilter);
    }

    setFilteredSamples(filtered);
  };

  const toggleCard = (id: number) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleStatusChange = async (sampleId: number, newStatus: Sample['status']) => {
    try {
      await updateSampleStatus(sampleId, { status: newStatus });
      setSamples(prev => prev.map(s => s.id === sampleId ? { ...s, status: newStatus } : s));
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const handleDelete = async (sampleId: number) => {
    if (!confirm('Are you sure you want to delete this sample?')) return;

    try {
      await deleteSample(sampleId);
      setSamples(prev => prev.filter(s => s.id !== sampleId));
    } catch (error) {
      console.error('Error deleting sample:', error);
      alert('Failed to delete sample');
    }
  };

  const exportToCSV = () => {
    const headers = ['VRL Serial No', 'Sample ID', 'Age/Gender', 'Hospital', 'Type of Analysis', 'Type of Sample', 'Collection Date', 'Reported On', 'Status', 'Notes'];

    const rows = filteredSamples.map(sample => [
      sample.sample_code,
      sample.patient_id,
      sample.age_gender,
      sample.from_hospital,
      sample.type_of_analysis,
      sample.type_of_sample,
      new Date(sample.collection_date).toLocaleString(),
      sample.reported_on ? new Date(sample.reported_on).toLocaleString() : '',
      sample.status,
      sample.notes || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `samples-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'received': return 'status-received';
      case 'processing': return 'status-processing';
      case 'completed': return 'status-completed';
      case 'rejected': return 'status-rejected';
      default: return '';
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'high': return 'priority-high';
      case 'normal': return 'priority-normal';
      case 'low': return 'priority-low';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="sample-tracking-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading samples...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sample-tracking-page">
      <div className="tracking-header">
        <div className="header-actions">
          <button onClick={exportToCSV} className="btn-export" disabled={filteredSamples.length === 0}>
            Export to CSV ({filteredSamples.length})
          </button>
        </div>
      </div>

      <div className="filters-section">
        <div className="search-bar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input
            type="text"
            placeholder="Search by VRL serial no, sample ID, hospital, or age/gender..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-row">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="received">Received</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>

          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="all">All Priorities</option>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>

          <select value={testTypeFilter} onChange={(e) => setTestTypeFilter(e.target.value)}>
            <option value="all">All Test Types</option>
            <option value="NBS - Newborn Screening">NBS - Newborn Screening</option>
            <option value="NBS - Metabolic Screening">NBS - Metabolic Screening</option>
            <option value="NBS - Extended Panel">NBS - Extended Panel</option>
          </select>

          {(searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || testTypeFilter !== 'all') && (
            <button
              className="btn-clear-filters"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setPriorityFilter('all');
                setTestTypeFilter('all');
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      <div className="samples-list">
        {filteredSamples.length === 0 ? (
          <div className="empty-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <h3>No samples found</h3>
            <p>{samples.length === 0 ? 'No samples have been created yet' : 'Try adjusting your filters'}</p>
          </div>
        ) : (
          filteredSamples.map(sample => {
            const isExpanded = expandedCards.has(sample.id);
            return (
              <div key={sample.id} className={`sample-card ${isExpanded ? 'expanded' : ''}`}>
                <div className="card-header" onClick={() => toggleCard(sample.id)}>
                  <div className="header-left">
                    <h3 className="sample-code">VRL: {sample.sample_code}</h3>
                    <span className="patient-name">{sample.patient_id || 'N/A'}</span>
                  </div>
                  <div className="header-right">
                    <span className={`status-badge ${getStatusBadgeClass(sample.status)}`}>
                      {sample.status}
                    </span>
                    <span className="hospital-badge">{sample.from_hospital || 'N/A'}</span>
                    <span className="collection-date">
                      {new Date(sample.collection_date).toLocaleDateString()}
                    </span>
                    <svg
                      className={`expand-icon ${isExpanded ? 'rotated' : ''}`}
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </div>
                </div>

                {isExpanded && (
                  <div className="card-content">
                    <div className="info-grid">
                      <div className="info-item">
                        <label>VRL Serial No</label>
                        <span>{sample.sample_code}</span>
                      </div>
                      <div className="info-item">
                        <label>Sample ID</label>
                        <span>{sample.patient_id || 'N/A'}</span>
                      </div>
                      <div className="info-item">
                        <label>Age / Gender</label>
                        <span>{sample.age_gender || 'N/A'}</span>
                      </div>
                      <div className="info-item">
                        <label>Hospital / Clinic</label>
                        <span>{sample.from_hospital || 'N/A'}</span>
                      </div>
                      <div className="info-item">
                        <label>Type of Analysis</label>
                        <span>{sample.type_of_analysis || 'N/A'}</span>
                      </div>
                      <div className="info-item">
                        <label>Type of Sample</label>
                        <span>{sample.type_of_sample || 'N/A'}</span>
                      </div>
                      <div className="info-item">
                        <label>Collection Date</label>
                        <span>{new Date(sample.collection_date).toLocaleString()}</span>
                      </div>
                      <div className="info-item">
                        <label>Reported On</label>
                        <span>{sample.reported_on ? new Date(sample.reported_on).toLocaleString() : 'Not yet reported'}</span>
                      </div>
                      <div className="info-item">
                        <label>Status</label>
                        <span className={`status-badge ${getStatusBadgeClass(sample.status)}`}>
                          {sample.status}
                        </span>
                      </div>
                      {sample.notes && (
                        <div className="info-item full-width">
                          <label>Notes</label>
                          <span>{sample.notes}</span>
                        </div>
                      )}
                    </div>

                    <div className="card-actions">
                      <div className="status-changer">
                        <label>Change Status:</label>
                        <select
                          value={sample.status}
                          onChange={(e) => handleStatusChange(sample.id, e.target.value as Sample['status'])}
                        >
                          <option value="received">Received</option>
                          <option value="processing">Processing</option>
                          <option value="completed">Completed</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>
                      <button className="btn-delete" onClick={() => handleDelete(sample.id)}>
                        Delete Sample
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
