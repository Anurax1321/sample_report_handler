import { useState, useEffect } from 'react';
import { getSamples, updateSampleStatus, deleteSample, updateReportedDate } from '../lib/sampleApi';
import type { Sample } from '../lib/sampleApi';
import './SampleTracking.css';

interface SampleTrackingProps {
  embedded?: boolean;
  onSamplesChange?: (samples: Sample[], filteredSamples: Sample[]) => void;
  refreshTrigger?: number;
}

export default function SampleTracking({ embedded, onSamplesChange, refreshTrigger }: SampleTrackingProps = {}) {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [filteredSamples, setFilteredSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [testTypeFilter, setTestTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    fetchSamples();
  }, []);

  useEffect(() => {
    if (refreshTrigger) fetchSamples();
  }, [refreshTrigger]);

  useEffect(() => {
    filterSamples();
  }, [samples, searchTerm, statusFilter, priorityFilter, testTypeFilter]);

  useEffect(() => {
    onSamplesChange?.(samples, filteredSamples);
  }, [samples, filteredSamples]);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedSample(null);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Keep selectedSample in sync with samples state
  useEffect(() => {
    if (selectedSample) {
      const updated = samples.find(s => s.id === selectedSample.id);
      if (updated) setSelectedSample(updated);
    }
  }, [samples]);

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

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(sample =>
        sample.sample_code.toLowerCase().includes(term) ||
        sample.patient_id.toLowerCase().includes(term) ||
        sample.from_hospital.toLowerCase().includes(term) ||
        sample.age_gender.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(sample => sample.status === statusFilter);
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(sample => sample.priority === priorityFilter);
    }

    if (testTypeFilter !== 'all') {
      filtered = filtered.filter(sample => sample.test_type === testTypeFilter);
    }

    setFilteredSamples(filtered);
    setCurrentPage(1);
  };

  const handleStatusChange = async (sampleId: number, newStatus: Sample['status']) => {
    try {
      const updatedSample = await updateSampleStatus(sampleId, { status: newStatus });
      setSamples(prev => prev.map(s => s.id === sampleId ? updatedSample : s));
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const handleReportedDateChange = async (sampleId: number, newDate: string) => {
    try {
      const updatedSample = await updateReportedDate(sampleId, {
        reported_on: newDate || null
      });
      setSamples(prev => prev.map(s => s.id === sampleId ? updatedSample : s));
    } catch (error) {
      console.error('Error updating reported date:', error);
      alert('Failed to update reported date');
    }
  };

  const handleDelete = async (sampleId: number) => {
    if (!confirm('Are you sure you want to delete this sample?')) return;

    try {
      await deleteSample(sampleId);
      setSelectedSample(null);
      setSamples(prev => prev.filter(s => s.id !== sampleId));
    } catch (error) {
      console.error('Error deleting sample:', error);
      alert('Failed to delete sample');
    }
  };

  const exportToCSV = () => {
    const headers = ['VRL Serial No', 'Patient Name', 'Sample ID', 'Age/Gender/Weight', 'Client Name', 'Type of Analysis', 'Type of Sample', 'Price', 'Collection Date', 'Reported On', 'Status', 'Notes'];

    const rows = filteredSamples.map(sample => [
      sample.sample_code,
      sample.patient_id,
      '',
      sample.age_gender,
      sample.from_hospital,
      sample.type_of_analysis,
      sample.type_of_sample,
      sample.sample_metadata?.price || '',
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

  if (loading) {
    const loadingContent = (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading samples...</p>
      </div>
    );
    if (embedded) return loadingContent;
    return <div className="sample-tracking-page">{loadingContent}</div>;
  }

  const content = (
    <>
      {!embedded && (
        <div className="tracking-header">
          <div className="header-actions">
            <button onClick={exportToCSV} className="btn-export" disabled={filteredSamples.length === 0}>
              Export to CSV ({filteredSamples.length})
            </button>
          </div>
        </div>
      )}

      <div className="table-panel">
        <div className="search-filter-row">
          <div className="search-bar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

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
              Clear
            </button>
          )}
        </div>

        {filteredSamples.length === 0 ? (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <h3>No samples found</h3>
            <p>{samples.length === 0 ? 'No samples have been created yet' : 'Try adjusting your filters'}</p>
          </div>
        ) : (
          <>
            <table className="samples-table">
              <thead>
                <tr>
                  <th>VRL Serial No</th>
                  <th>Patient Name</th>
                  <th>Status</th>
                  <th>Collection Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredSamples
                  .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                  .map(sample => (
                    <tr key={sample.id} onClick={() => setSelectedSample(sample)}>
                      <td className="cell-code">{sample.sample_code}</td>
                      <td>{sample.patient_id || 'N/A'}</td>
                      <td>
                        <span className={`status-badge ${getStatusBadgeClass(sample.status)}`}>
                          {sample.status}
                        </span>
                      </td>
                      <td>{new Date(sample.collection_date).toLocaleDateString()}</td>
                    </tr>
                  ))}
              </tbody>
            </table>

            <div className="pagination">
              <span className="pagination-info">
                Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredSamples.length)} of {filteredSamples.length}
              </span>
              <div className="pagination-controls">
                <button
                  className="pagination-btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  Prev
                </button>
                {Array.from({ length: Math.ceil(filteredSamples.length / pageSize) }, (_, i) => (
                  <button
                    key={i + 1}
                    className={`pagination-btn ${currentPage === i + 1 ? 'pagination-active' : ''}`}
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  className="pagination-btn"
                  disabled={currentPage === Math.ceil(filteredSamples.length / pageSize)}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {selectedSample && (
        <div className="modal-backdrop" onClick={() => setSelectedSample(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>VRL: {selectedSample.sample_code}</h2>
              <button className="modal-close" onClick={() => setSelectedSample(null)}>&times;</button>
            </div>

            <div className="modal-body">
              <div className="info-grid">
                <div className="info-item">
                  <label>VRL Serial No</label>
                  <span>{selectedSample.sample_code}</span>
                </div>
                <div className="info-item">
                  <label>Patient Name</label>
                  <span>{selectedSample.patient_id || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>Client Name</label>
                  <span>{selectedSample.from_hospital || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>Age</label>
                  <span>{selectedSample.age_gender ? selectedSample.age_gender.split('/')[0] : 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>Gender</label>
                  <span>{selectedSample.age_gender && selectedSample.age_gender.split('/')[1] ? selectedSample.age_gender.split('/')[1] : 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>Weight</label>
                  <span>{selectedSample.age_gender && selectedSample.age_gender.split('/')[2] ? selectedSample.age_gender.split('/')[2] : 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>Type of Analysis</label>
                  <span>{selectedSample.type_of_analysis || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>Type of Sample</label>
                  <span>{selectedSample.type_of_sample || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>Price</label>
                  <span>{selectedSample.sample_metadata?.price ? `₹${selectedSample.sample_metadata.price}` : 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>Collection Date</label>
                  <span>{new Date(selectedSample.collection_date).toLocaleString()}</span>
                </div>
                <div className="info-item">
                  <label>Reported On</label>
                  <input
                    type="datetime-local"
                    value={selectedSample.reported_on ? new Date(selectedSample.reported_on).toISOString().slice(0, 16) : ''}
                    onChange={(e) => handleReportedDateChange(selectedSample.id, e.target.value)}
                    className="reported-date-input"
                  />
                </div>
                <div className="info-item">
                  <label>Status</label>
                  <span className={`status-badge ${getStatusBadgeClass(selectedSample.status)}`}>
                    {selectedSample.status}
                  </span>
                </div>
                {selectedSample.notes && (
                  <div className="info-item full-width">
                    <label>Notes</label>
                    <span>{selectedSample.notes}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-actions">
              <div className="status-changer">
                <label>Change Status:</label>
                <select
                  value={selectedSample.status}
                  onChange={(e) => handleStatusChange(selectedSample.id, e.target.value as Sample['status'])}
                >
                  <option value="received">Received</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <button className="btn-delete" onClick={() => handleDelete(selectedSample.id)}>
                Delete Sample
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (embedded) return content;
  return <div className="sample-tracking-page">{content}</div>;
}
