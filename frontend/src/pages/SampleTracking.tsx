import { useState, useEffect } from 'react';
import { getSamples, updateSampleStatus, deleteSample, updateReportedDate, updateSample, getLinkedReports, getSamplePdfs, downloadSamplePdf, deleteSamplePdf } from '../lib/sampleApi';
import type { Sample, UnlinkedReport, SamplePdf } from '../lib/sampleApi';
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
  const [isEditing, setIsEditing] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [linkedReports, setLinkedReports] = useState<UnlinkedReport[]>([]);
  const [samplePdfs, setSamplePdfs] = useState<SamplePdf[]>([]);
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
    // Fetch linked reports and PDFs
    if (selectedSample) {
      getLinkedReports(selectedSample.id)
        .then(reports => setLinkedReports(reports))
        .catch(() => setLinkedReports([]));
      getSamplePdfs(selectedSample.id)
        .then(pdfs => setSamplePdfs(pdfs))
        .catch(() => setSamplePdfs([]));
    } else {
      setLinkedReports([]);
      setSamplePdfs([]);
      setIsEditing(false);
      setStatusDropdownOpen(false);
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
      setIsEditing(false);
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
              <div className="modal-title-row">
                <h2>{selectedSample.patient_id || 'Unnamed Patient'}</h2>
                {!isEditing ? (
                  <button className="btn-edit-toggle" onClick={() => setIsEditing(true)} title="Edit sample">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                    </svg>
                    Edit
                  </button>
                ) : (
                  <button className="btn-edit-toggle editing" onClick={() => setIsEditing(false)} title="Cancel editing">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                    Cancel
                  </button>
                )}
              </div>
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
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.patient_id || ''}
                      onChange={(e) => handleEditChange('patient_id', e.target.value)}
                      className="edit-input"
                    />
                  ) : (
                    <span>{selectedSample.patient_id || 'N/A'}</span>
                  )}
                </div>
                <div className="info-item">
                  <label>Client Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.from_hospital || ''}
                      onChange={(e) => handleEditChange('from_hospital', e.target.value)}
                      className="edit-input"
                    />
                  ) : (
                    <span>{selectedSample.from_hospital || 'N/A'}</span>
                  )}
                </div>
                <div className="info-item">
                  <label>Age</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.age || ''}
                      onChange={(e) => handleEditChange('age', e.target.value)}
                      placeholder="e.g., 10D, 3M, 2Y"
                      className="edit-input"
                    />
                  ) : (
                    <span>{(selectedSample.age_gender || '').split('/')[0] || 'N/A'}</span>
                  )}
                </div>
                <div className="info-item">
                  <label>Gender</label>
                  {isEditing ? (
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
                  ) : (
                    <span>{{ M: 'Male', F: 'Female', O: 'Other' }[(selectedSample.age_gender || '').split('/')[1] || ''] || 'N/A'}</span>
                  )}
                </div>
                <div className="info-item">
                  <label>Weight</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.weight || ''}
                      onChange={(e) => handleEditChange('weight', e.target.value)}
                      placeholder="e.g., 2.64kg"
                      className="edit-input"
                    />
                  ) : (
                    <span>{(selectedSample.age_gender || '').split('/')[2] || 'N/A'}</span>
                  )}
                </div>
                <div className="info-item">
                  <label>Type of Analysis</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.type_of_analysis || ''}
                      onChange={(e) => handleEditChange('type_of_analysis', e.target.value)}
                      className="edit-input"
                    />
                  ) : (
                    <span>{selectedSample.type_of_analysis || 'N/A'}</span>
                  )}
                </div>
                <div className="info-item">
                  <label>Type of Sample</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.type_of_sample || ''}
                      onChange={(e) => handleEditChange('type_of_sample', e.target.value)}
                      className="edit-input"
                    />
                  ) : (
                    <span>{selectedSample.type_of_sample || 'N/A'}</span>
                  )}
                </div>
                <div className="info-item">
                  <label>Price (₹)</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.price || ''}
                      onChange={(e) => handleEditChange('price', e.target.value)}
                      className="edit-input"
                    />
                  ) : (
                    <span>{selectedSample.sample_metadata?.price || 'N/A'}</span>
                  )}
                </div>
                <div className="info-item">
                  <label>Collection Date</label>
                  {isEditing ? (
                    <input
                      type="datetime-local"
                      value={editForm.collection_date || ''}
                      onChange={(e) => handleEditChange('collection_date', e.target.value)}
                      className="edit-input"
                    />
                  ) : (
                    <span>{selectedSample.collection_date ? new Date(selectedSample.collection_date).toLocaleString() : '—'}</span>
                  )}
                </div>
                <div className="info-item">
                  <label>Reported On</label>
                  {isEditing ? (
                    <input
                      type="datetime-local"
                      value={selectedSample.reported_on ? new Date(selectedSample.reported_on).toISOString().slice(0, 16) : ''}
                      onChange={(e) => handleReportedDateChange(selectedSample.id, e.target.value)}
                      className="edit-input"
                    />
                  ) : (
                    <span>{selectedSample.reported_on ? new Date(selectedSample.reported_on).toLocaleString() : '—'}</span>
                  )}
                </div>
                <div className="info-item">
                  <label>Status</label>
                  <div className="status-dropdown-wrapper">
                    <button
                      type="button"
                      className={`status-dropdown-trigger ${getStatusBadgeClass(selectedSample.status)}`}
                      onClick={() => setStatusDropdownOpen(prev => !prev)}
                    >
                      <span className="status-dot"></span>
                      {selectedSample.status}
                      <svg className={`status-chevron ${statusDropdownOpen ? 'open' : ''}`} width="10" height="6" viewBox="0 0 10 6" fill="none">
                        <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4"/>
                      </svg>
                    </button>
                    {statusDropdownOpen && (
                      <>
                        <div className="status-dropdown-backdrop" onClick={() => setStatusDropdownOpen(false)} />
                        <div className="status-dropdown-menu">
                          {(['received', 'processing', 'completed', 'rejected'] as const).map(status => (
                            <button
                              key={status}
                              type="button"
                              className={`status-dropdown-item ${getStatusBadgeClass(status)} ${selectedSample.status === status ? 'active' : ''}`}
                              onClick={() => {
                                handleStatusChange(selectedSample.id, status);
                                setStatusDropdownOpen(false);
                              }}
                            >
                              <span className="status-dot"></span>
                              {status}
                              {selectedSample.status === status && (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="status-check">
                                  <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                              )}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                {(isEditing || selectedSample.notes) && (
                  <div className="info-item full-width">
                    <label>Notes</label>
                    {isEditing ? (
                      <textarea
                        value={editForm.notes || ''}
                        onChange={(e) => handleEditChange('notes', e.target.value)}
                        className="edit-input"
                        rows={3}
                      />
                    ) : (
                      <span>{selectedSample.notes}</span>
                    )}
                  </div>
                )}
                {linkedReports.length > 0 && (
                  <div className="info-item full-width">
                    <label>Attached Reports</label>
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
                  </div>
                )}
                {samplePdfs.length > 0 && (
                  <div className="info-item full-width">
                    <label>Uploaded PDFs</label>
                    <div className="linked-reports-list">
                      {samplePdfs.map(pdf => (
                        <div key={pdf.id} className="linked-report-item">
                          <span className="linked-report-title">{pdf.filename}</span>
                          <span className="linked-report-meta">
                            {pdf.file_size < 1024 * 1024
                              ? `${(pdf.file_size / 1024).toFixed(1)} KB`
                              : `${(pdf.file_size / (1024 * 1024)).toFixed(1)} MB`}
                            {' '}&middot; {new Date(pdf.uploaded_at).toLocaleDateString()}
                          </span>
                          <button
                            type="button"
                            className="btn-download-pdf"
                            onClick={() => downloadSamplePdf(pdf.id, pdf.filename)}
                          >
                            Download
                          </button>
                          <button
                            type="button"
                            className="btn-delete-pdf"
                            onClick={async () => {
                              if (!confirm(`Delete ${pdf.filename}?`)) return;
                              try {
                                await deleteSamplePdf(pdf.id);
                                setSamplePdfs(prev => prev.filter(p => p.id !== pdf.id));
                              } catch {
                                alert('Failed to delete PDF');
                              }
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              {isEditing && (
                <div className="modal-actions">
                  <button
                    className="btn-primary"
                    onClick={handleSaveChanges}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
              <button className="btn-delete-subtle" onClick={() => handleDelete(selectedSample.id)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                Delete sample
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
