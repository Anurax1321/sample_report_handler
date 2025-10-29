import { useState, useEffect } from 'react';
import './ReportHandling.css';
import { uploadReport, downloadReport } from '../lib/reportApi';
import type { Report } from '../lib/reportApi';
import api from '../lib/api';

interface Sample {
  id: number;
  sample_code: string;
  test_type: string;
  status: string;
}

export default function ReportHandling() {
  const [files, setFiles] = useState<{[key: string]: File | null}>({
    file1: null,
    file2: null,
    file3: null
  });

  const [samples, setSamples] = useState<Sample[]>([]);
  const [selectedSampleId, setSelectedSampleId] = useState<number | null>(null);
  const [numPatients, setNumPatients] = useState<number>(1);
  const [uploadedBy, setUploadedBy] = useState<string>('anonymous');

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadedReport, setUploadedReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch samples on component mount
  useEffect(() => {
    fetchSamples();
  }, []);

  const fetchSamples = async () => {
    try {
      const response = await api.get<Sample[]>('/samples');
      setSamples(response.data);
    } catch (err) {
      console.error('Failed to fetch samples:', err);
    }
  };

  const handleFileChange = (fileKey: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setFiles(prev => ({ ...prev, [fileKey]: file }));
    setError(null); // Clear error when file is selected
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setUploadedReport(null);

    // Validation
    if (!selectedSampleId) {
      setError('Please select a sample');
      return;
    }

    if (!files.file1 || !files.file2 || !files.file3) {
      setError('Please select all 3 files');
      return;
    }

    if (numPatients < 1) {
      setError('Number of patients must be at least 1');
      return;
    }

    // Upload and process
    setIsUploading(true);
    setUploadProgress('Uploading files...');

    try {
      const report = await uploadReport(
        selectedSampleId,
        numPatients,
        files.file1,
        files.file2,
        files.file3,
        uploadedBy
      );

      setUploadProgress('Processing complete!');
      setUploadedReport(report);

      // Reset form after successful upload
      setFiles({ file1: null, file2: null, file3: null });
      setNumPatients(1);

    } catch (err: any) {
      console.error('Upload failed:', err);
      const errorMsg = err.response?.data?.detail || 'Failed to upload and process files';
      setError(errorMsg);
      setUploadProgress('');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async () => {
    if (!uploadedReport) return;

    try {
      await downloadReport(uploadedReport.id, uploadedReport.date_code);
    } catch (err) {
      console.error('Download failed:', err);
      setError('Failed to download report');
    }
  };

  return (
    <div className="page-layout">
      <div className="page-header">
        <h1 className="page-title">Report Handling</h1>
      </div>
      <div className="page-content">
        <div className="content-card report-card">
          <div className="card-header">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
            <div>
              <h2>Upload NBS Reports</h2>
              <p>Upload 3 text files (AA, AC, AC_EXT) for processing</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="upload-form">
            {/* Sample Selection */}
            <div className="file-input-group">
              <label className="file-input-label">
                <span className="file-label-text">Select Sample *</span>
                <select
                  value={selectedSampleId || ''}
                  onChange={(e) => setSelectedSampleId(Number(e.target.value))}
                  className="sample-select"
                  required
                >
                  <option value="">-- Select a sample --</option>
                  {samples.map((sample) => (
                    <option key={sample.id} value={sample.id}>
                      {sample.sample_code} ({sample.test_type})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* Number of Patients */}
            <div className="file-input-group">
              <label className="file-input-label">
                <span className="file-label-text">Number of Patients *</span>
                <input
                  type="number"
                  min="1"
                  value={numPatients}
                  onChange={(e) => setNumPatients(Number(e.target.value))}
                  className="patient-count-input"
                  required
                />
                <span style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  (Excludes 4 control samples)
                </span>
              </label>
            </div>

            {/* Uploaded By */}
            <div className="file-input-group">
              <label className="file-input-label">
                <span className="file-label-text">Uploaded By</span>
                <input
                  type="text"
                  value={uploadedBy}
                  onChange={(e) => setUploadedBy(e.target.value)}
                  className="patient-count-input"
                  placeholder="Enter your name (optional)"
                />
              </label>
            </div>
            <div className="file-input-group">
              <label className="file-input-label">
                <div className="file-input-header">
                  <span className="file-label-text">Report File 1</span>
                  {files.file1 && <span className="file-name">{files.file1.name}</span>}
                </div>
                <div className="file-input-wrapper">
                  <input
                    type="file"
                    onChange={(e) => handleFileChange('file1', e)}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.csv"
                    className="file-input"
                  />
                  <div className="file-input-display">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    <span>{files.file1 ? 'Change file' : 'Choose file'}</span>
                  </div>
                </div>
              </label>
            </div>

            <div className="file-input-group">
              <label className="file-input-label">
                <div className="file-input-header">
                  <span className="file-label-text">Report File 2</span>
                  {files.file2 && <span className="file-name">{files.file2.name}</span>}
                </div>
                <div className="file-input-wrapper">
                  <input
                    type="file"
                    onChange={(e) => handleFileChange('file2', e)}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.csv"
                    className="file-input"
                  />
                  <div className="file-input-display">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    <span>{files.file2 ? 'Change file' : 'Choose file'}</span>
                  </div>
                </div>
              </label>
            </div>

            <div className="file-input-group">
              <label className="file-input-label">
                <div className="file-input-header">
                  <span className="file-label-text">Report File 3</span>
                  {files.file3 && <span className="file-name">{files.file3.name}</span>}
                </div>
                <div className="file-input-wrapper">
                  <input
                    type="file"
                    onChange={(e) => handleFileChange('file3', e)}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.csv"
                    className="file-input"
                  />
                  <div className="file-input-display">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    <span>{files.file3 ? 'Change file' : 'Choose file'}</span>
                  </div>
                </div>
              </label>
            </div>

            <div className="form-actions">
              <button type="submit" className="submit-button" disabled={isUploading}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                {isUploading ? 'Processing...' : 'Upload & Process Reports'}
              </button>
            </div>

            {/* Progress Message */}
            {uploadProgress && (
              <div style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: '#e3f2fd',
                borderRadius: '8px',
                color: '#1976d2',
                textAlign: 'center'
              }}>
                {uploadProgress}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: '#ffebee',
                borderRadius: '8px',
                color: '#c62828',
                textAlign: 'center'
              }}>
                Error: {error}
              </div>
            )}

            {/* Success Message with Download */}
            {uploadedReport && uploadedReport.processing_status === 'completed' && (
              <div style={{
                marginTop: '16px',
                padding: '16px',
                backgroundColor: '#e8f5e9',
                borderRadius: '8px',
                color: '#2e7d32'
              }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
                  Report Processed Successfully!
                </div>
                <div style={{ marginBottom: '12px', fontSize: '14px' }}>
                  Report ID: {uploadedReport.id} | Date: {uploadedReport.date_code}
                </div>
                <button
                  onClick={handleDownload}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#2e7d32',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Download Report ZIP
                </button>
              </div>
            )}

            {/* Failed Processing */}
            {uploadedReport && uploadedReport.processing_status === 'failed' && (
              <div style={{
                marginTop: '16px',
                padding: '16px',
                backgroundColor: '#ffebee',
                borderRadius: '8px',
                color: '#c62828'
              }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
                  Processing Failed
                </div>
                <div style={{ fontSize: '14px' }}>
                  {uploadedReport.error_message || 'An unknown error occurred during processing'}
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
