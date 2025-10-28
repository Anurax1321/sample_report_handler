import { useState } from 'react';
import './ReportHandling.css';

export default function ReportHandling() {
  const [files, setFiles] = useState<{[key: string]: File | null}>({
    file1: null,
    file2: null,
    file3: null
  });

  const handleFileChange = (fileKey: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setFiles(prev => ({ ...prev, [fileKey]: file }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Files to upload:', files);
    // Backend connection will be implemented later
    alert('Files ready for upload. Backend connection coming soon!');
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
              <h2>Upload Reports</h2>
              <p>Select up to 3 files to upload</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="upload-form">
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
              <button type="submit" className="submit-button">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                Upload Reports
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
