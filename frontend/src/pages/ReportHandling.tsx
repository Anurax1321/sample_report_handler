import { useState, useEffect } from 'react';
import './ReportHandling.css';
import { uploadReport, downloadReport } from '../lib/reportApi';
import type { Report } from '../lib/reportApi';

const MEMBERS_STORAGE_KEY = 'report_handling_members';

export default function ReportHandling() {
  const [files, setFiles] = useState<{[key: string]: File | null}>({
    file1: null,
    file2: null,
    file3: null
  });

  const [uploadedBy, setUploadedBy] = useState<string>('anonymous');
  const [members, setMembers] = useState<string[]>([]);
  const [showMemberManagement, setShowMemberManagement] = useState(false);
  const [customName, setCustomName] = useState<string>('');

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadedReport, setUploadedReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{valid: boolean, message: string} | null>(null);

  // Load members from localStorage on mount
  useEffect(() => {
    const savedMembers = localStorage.getItem(MEMBERS_STORAGE_KEY);
    if (savedMembers) {
      setMembers(JSON.parse(savedMembers));
    }
  }, []);

  // Save members to localStorage whenever they change
  useEffect(() => {
    if (members.length > 0) {
      localStorage.setItem(MEMBERS_STORAGE_KEY, JSON.stringify(members));
    }
  }, [members]);

  const handleRemoveMember = (memberToRemove: string) => {
    setMembers(members.filter(m => m !== memberToRemove));
    if (uploadedBy === memberToRemove) {
      setUploadedBy('anonymous');
    }
  };

  const validateFiles = async (file1: File | null, file2: File | null, file3: File | null) => {
    if (!file1 || !file2 || !file3) {
      setValidationResult(null);
      return;
    }

    setIsValidating(true);
    setValidationResult(null);
    setError(null);

    try {
      // Extract filename info
      const extractFileInfo = (filename: string) => {
        const match = filename.match(/^(\d{8})_(AA|AC|AC_EXT)\.txt$/);
        if (!match) {
          throw new Error(`Invalid filename format: "${filename}". Expected: DDMMYYYY_XX.txt`);
        }
        return { date: match[1], type: match[2] };
      };

      const info1 = extractFileInfo(file1.name);
      const info2 = extractFileInfo(file2.name);
      const info3 = extractFileInfo(file3.name);

      // Check all dates match
      if (!(info1.date === info2.date && info2.date === info3.date)) {
        throw new Error(
          `Date mismatch: ${info1.type}=${info1.date}, ${info2.type}=${info2.date}, ${info3.type}=${info3.date}. All files must have the same date.`
        );
      }

      // Check we have exactly one of each type
      const types = new Set([info1.type, info2.type, info3.type]);
      if (types.size !== 3 || !types.has('AA') || !types.has('AC') || !types.has('AC_EXT')) {
        const foundTypes = [info1.type, info2.type, info3.type].join(', ');
        throw new Error(
          `Missing or duplicate file types. Expected one of each: AA, AC, AC_EXT. Got: ${foundTypes}`
        );
      }

      // Validate date components
      const day = parseInt(info1.date.substring(0, 2));
      const month = parseInt(info1.date.substring(2, 4));
      const year = parseInt(info1.date.substring(4, 8));

      if (day < 1 || day > 31) throw new Error(`Invalid day: ${day}`);
      if (month < 1 || month > 12) throw new Error(`Invalid month: ${month}`);
      if (year < 2000 || year > 2100) throw new Error(`Invalid year: ${year}`);

      // All validations passed
      setValidationResult({
        valid: true,
        message: `✓ Files validated successfully! Date: ${info1.date.substring(0, 2)}/${info1.date.substring(2, 4)}/${info1.date.substring(4, 8)}`
      });
    } catch (err: any) {
      setValidationResult({
        valid: false,
        message: err.message
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleFileChange = (fileKey: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    const newFiles = { ...files, [fileKey]: file };
    setFiles(newFiles);
    setError(null);
    setUploadedReport(null);

    // Auto-validate when all 3 files are selected
    validateFiles(newFiles.file1, newFiles.file2, newFiles.file3);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setUploadedReport(null);

    // Validation
    if (!files.file1 || !files.file2 || !files.file3) {
      setError('Please select all 3 files');
      return;
    }

    // Upload and process
    setIsUploading(true);
    setUploadProgress('Uploading files...');

    try {
      const report = await uploadReport(
        files.file1,
        files.file2,
        files.file3,
        uploadedBy
      );

      setUploadProgress('Processing complete!');
      setUploadedReport(report);

      // Save the name to members list after successful upload
      if (uploadedBy && uploadedBy !== 'anonymous' && !members.includes(uploadedBy)) {
        setMembers([...members, uploadedBy]);
      }

      // Reset form after successful upload
      setFiles({ file1: null, file2: null, file3: null });

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
            {/* Uploaded By with Auto-save and Member Management */}
            <div className="file-input-group">
              <label className="file-input-label">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span className="file-label-text">Uploaded By</span>
                  {members.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowMemberManagement(!showMemberManagement)}
                      style={{
                        padding: '0.3rem 0.6rem',
                        background: 'transparent',
                        color: '#d4a574',
                        border: '1px solid #d4a574',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#fff8ed';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {showMemberManagement ? '✕ Close' : `⚙️ Manage (${members.length})`}
                    </button>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    list="members-list"
                    value={uploadedBy}
                    onChange={(e) => setUploadedBy(e.target.value)}
                    placeholder="Type name or select from list..."
                    className="patient-count-input"
                    style={{
                      width: '100%',
                      fontSize: '1rem',
                      padding: '0.75rem'
                    }}
                  />
                  <datalist id="members-list">
                    <option value="anonymous">Anonymous</option>
                    {members.map((member) => (
                      <option key={member} value={member}>{member}</option>
                    ))}
                  </datalist>
                </div>
                <p style={{
                  fontSize: '0.8rem',
                  color: '#718096',
                  margin: '0.5rem 0 0 0',
                  fontStyle: 'italic'
                }}>
                  Name will be saved after successful upload
                </p>
              </label>

              {/* Member Management Panel */}
              {showMemberManagement && members.length > 0 && (
                <div style={{
                  marginTop: '0.75rem',
                  background: 'white',
                  border: '2px solid #d4a574',
                  borderRadius: '8px',
                  padding: '1rem',
                  boxShadow: '0 4px 12px rgba(212, 165, 116, 0.15)'
                }}>
                  <h4 style={{
                    margin: '0 0 0.75rem 0',
                    fontSize: '0.9rem',
                    color: '#2d3748',
                    fontWeight: '600'
                  }}>
                    Saved Members ({members.length})
                  </h4>

                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    maxHeight: '200px',
                    overflowY: 'auto'
                  }}>
                    {members.map((member) => (
                      <div
                        key={member}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.6rem 0.8rem',
                          background: uploadedBy === member ? '#fff8ed' : '#f7fafc',
                          borderRadius: '6px',
                          border: uploadedBy === member ? '1px solid #d4a574' : '1px solid #e2e8f0',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <span
                          onClick={() => setUploadedBy(member)}
                          style={{
                            flex: 1,
                            fontWeight: uploadedBy === member ? '600' : '500',
                            color: uploadedBy === member ? '#d4a574' : '#2d3748',
                            fontSize: '0.9rem',
                            cursor: 'pointer'
                          }}
                        >
                          {uploadedBy === member && '✓ '}
                          {member}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member)}
                          style={{
                            padding: '0.3rem 0.6rem',
                            background: 'transparent',
                            color: '#ef4444',
                            border: '1px solid #fecaca',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#fee2e2';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                    accept=".txt"
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
                    accept=".txt"
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
                    accept=".txt"
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

            {/* Validation Status */}
            {isValidating && (
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                background: '#e3f2fd',
                borderRadius: '8px',
                color: '#1976d2',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid #1976d2',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }}></div>
                Validating files...
              </div>
            )}

            {validationResult && (
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                background: validationResult.valid ? '#e8f5e9' : '#ffebee',
                borderRadius: '8px',
                color: validationResult.valid ? '#2e7d32' : '#c62828',
                border: `2px solid ${validationResult.valid ? '#4caf50' : '#ef5350'}`,
                fontWeight: '500'
              }}>
                {validationResult.message}
              </div>
            )}

            <div className="form-actions">
              <button
                type="submit"
                className="submit-button"
                disabled={isUploading || isValidating || !validationResult?.valid}
                style={{
                  opacity: (isUploading || isValidating || !validationResult?.valid) ? 0.5 : 1,
                  cursor: (isUploading || isValidating || !validationResult?.valid) ? 'not-allowed' : 'pointer'
                }}
              >
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
