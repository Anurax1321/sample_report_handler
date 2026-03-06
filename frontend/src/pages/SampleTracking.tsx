import { useState, useEffect } from 'react';
import { getSamples, updateSampleStatus, deleteSample, updateReportedDate, updateSample, getLinkedReports } from '../lib/sampleApi';
import type { Sample, UnlinkedReport } from '../lib/sampleApi';
import { downloadPDF } from '../lib/reportApi';
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
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [linkedReports, setLinkedReports] = useState<UnlinkedReport[]>([]);
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

  // Initialize edit form when a sample is selected
  useEffect(() => {
    if (selectedSample) {
      const parts = (selectedSample.age_gender || '').split('/');
      setEditForm({
        patient_id: selectedSample.patient_id || '',
        from_hospital: selectedSample.from_hospital || '',
        age: parts[0] || '',
        gender: parts[1] || '',
        weight: parts[2] || '',
        type_of_analysis: selectedSample.type_of_analysis || '',
        type_of_sample: selectedSample.type_of_sample || '',
        price: selectedSample.sample_metadata?.price || '',
        collection_date: selectedSample.collection_date
          ? new Date(selectedSample.collection_date).toISOString().slice(0, 16)
          : '',
        notes: selectedSample.notes || '',
      });
    }
    // Fetch linked reports
    if (selectedSample) {
      getLinkedReports(selectedSample.id)
        .then(reports => setLinkedReports(reports))
        .catch(() => setLinkedReports([]));
    } else {
      setLinkedReports([]);
    }
  }, [selectedSample?.id]);

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

  const handleEditChange = (field: string, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveChanges = async () => {
    if (!selectedSample) return;
    setSaving(true);
    try {
      const ageGender = [editForm.age, editForm.gender, editForm.weight].filter(Boolean).join('/');
      const updatedSample = await updateSample(selectedSample.id, {
        patient_id: editForm.patient_id,
        age_gender: ageGender,
        from_hospital: editForm.from_hospital,
        type_of_analysis: editForm.type_of_analysis,
        type_of_sample: editForm.type_of_sample,
        collection_date: editForm.collection_date || undefined,
        notes: editForm.notes,
        sample_metadata: { price: editForm.price },
      });
      setSamples(prev => prev.map(s => s.id === selectedSample.id ? updatedSample : s));
      setSelectedSample(updatedSample);
      alert('Changes saved successfully');
    } catch (error) {
      console.error('Error saving changes:', error);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
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
                  <input
                    type="text"
                    value={editForm.patient_id || ''}
                    onChange={(e) => handleEditChange('patient_id', e.target.value)}
                    className="edit-input"
                  />
                </div>
                <div className="info-item">
                  <label>Client Name</label>
                  <input
                    type="text"
                    value={editForm.from_hospital || ''}
                    onChange={(e) => handleEditChange('from_hospital', e.target.value)}
                    className="edit-input"
                  />
                </div>
                <div className="info-item">
                  <label>Age</label>
                  <input
                    type="text"
                    value={editForm.age || ''}
                    onChange={(e) => handleEditChange('age', e.target.value)}
                    placeholder="e.g., 10D, 3M, 2Y"
                    className="edit-input"
                  />
                </div>
                <div className="info-item">
                  <label>Gender</label>
                  <select
                    value={editForm.gender || ''}
                    onChange={(e) => handleEditChange('gender', e.target.value)}
                    className="edit-input"
                  >
                    <option value="">Select</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="O">Other</option>
                  </select>
                </div>
                <div className="info-item">
                  <label>Weight</label>
                  <input
                    type="text"
                    value={editForm.weight || ''}
                    onChange={(e) => handleEditChange('weight', e.target.value)}
                    placeholder="e.g., 2.64kg"
                    className="edit-input"
                  />
                </div>
                <div className="info-item">
                  <label>Type of Analysis</label>
                  <input
                    type="text"
                    value={editForm.type_of_analysis || ''}
                    onChange={(e) => handleEditChange('type_of_analysis', e.target.value)}
                    className="edit-input"
                  />
                </div>
                <div className="info-item">
                  <label>Type of Sample</label>
                  <input
                    type="text"
                    value={editForm.type_of_sample || ''}
                    onChange={(e) => handleEditChange('type_of_sample', e.target.value)}
                    className="edit-input"
                  />
                </div>
                <div className="info-item">
                  <label>Price (₹)</label>
                  <input
                    type="text"
                    value={editForm.price || ''}
                    onChange={(e) => handleEditChange('price', e.target.value)}
                    className="edit-input"
                  />
                </div>
                <div className="info-item">
                  <label>Collection Date</label>
                  <input
                    type="datetime-local"
                    value={editForm.collection_date || ''}
                    onChange={(e) => handleEditChange('collection_date', e.target.value)}
                    className="edit-input"
                  />
                </div>
                <div className="info-item">
                  <label>Reported On</label>
                  <input
                    type="datetime-local"
                    value={selectedSample.reported_on ? new Date(selectedSample.reported_on).toISOString().slice(0, 16) : ''}
                    onChange={(e) => handleReportedDateChange(selectedSample.id, e.target.value)}
                    className="edit-input"
                  />
                </div>
                <div className="info-item">
                  <label>Status</label>
                  <span className={`status-badge ${getStatusBadgeClass(selectedSample.status)}`}>
                    {selectedSample.status}
                  </span>
                </div>
                <div className="info-item full-width">
                  <label>Notes</label>
                  <textarea
                    value={editForm.notes || ''}
                    onChange={(e) => handleEditChange('notes', e.target.value)}
                    className="edit-input"
                    rows={3}
                  />
                </div>
                <div className="info-item full-width">
                  <label>Attached Reports</label>
                  {linkedReports.length === 0 ? (
                    <span className="no-reports">No reports attached</span>
                  ) : (
                    <div className="linked-reports-list">
                      {linkedReports.map(report => (
                        <div key={report.id} className="linked-report-item">
                          <span className="linked-report-title">
                            Report #{report.id} &mdash; {report.date_code}
                          </span>
                          <span className="linked-report-meta">
                            {report.num_patients} patient{report.num_patients !== 1 ? 's' : ''} &middot; {new Date(report.upload_date).toLocaleDateString()}
                          </span>
                          <button
                            type="button"
                            className="btn-download-pdf"
                            onClick={() => downloadPDF(report.id, `NBS_Reports_${report.date_code}.zip`)}
                          >
                            Download PDF
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="btn-primary"
                onClick={handleSaveChanges}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
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
