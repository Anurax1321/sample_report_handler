import { useState, useRef } from 'react';
import './FileUploader.css';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  onMultiFileSelect?: (files: File[]) => void;
  acceptedTypes: string;
  maxSizeMB?: number;
  label: string;
  disabled?: boolean;
  showUploadButton?: boolean;
  allowMultiplePDFs?: boolean;
}

export default function FileUploader({
  onFileSelect,
  onMultiFileSelect,
  acceptedTypes,
  maxSizeMB = 50,
  label,
  disabled = false,
  showUploadButton = true,
  allowMultiplePDFs = false
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const validateFile = (file: File): string | null => {
    // Check file type by extension
    const fileExtension = file.name.toLowerCase().split('.').pop();
    const validExtensions = ['pdf', 'zip'];

    if (!validExtensions.includes(fileExtension || '')) {
      return `Invalid file type. Please upload a PDF or ZIP file.`;
    }

    // Check file size with specific limits
    const fileSizeMB = file.size / (1024 * 1024);
    const isPDF = fileExtension === 'pdf';
    const actualLimit = isPDF ? 50 : maxSizeMB;

    if (fileSizeMB > actualLimit) {
      return `File size exceeds ${actualLimit}MB limit for ${isPDF ? 'PDF' : 'ZIP'} files`;
    }

    return null;
  };

  const handleMultipleFiles = (fileList: FileList) => {
    const pdfFiles: File[] = [];
    const errors: string[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const ext = file.name.toLowerCase().split('.').pop();

      // If a single ZIP is selected, treat as single file
      if (ext === 'zip' && fileList.length === 1) {
        setSelectedFile(file);
        setSelectedFiles([]);
        if (!showUploadButton) onFileSelect(file);
        return;
      }

      if (ext !== 'pdf') {
        errors.push(`${file.name}: not a PDF file`);
        continue;
      }

      const err = validateFile(file);
      if (err) {
        errors.push(`${file.name}: ${err}`);
        continue;
      }
      pdfFiles.push(file);
    }

    if (errors.length > 0) {
      alert(`Some files were skipped:\n${errors.join('\n')}`);
    }

    if (pdfFiles.length === 1) {
      // Single PDF — use normal single-file flow
      setSelectedFile(pdfFiles[0]);
      setSelectedFiles([]);
      if (!showUploadButton) onFileSelect(pdfFiles[0]);
    } else if (pdfFiles.length > 1) {
      setSelectedFile(null);
      setSelectedFiles(pdfFiles);
      if (!showUploadButton && onMultiFileSelect) onMultiFileSelect(pdfFiles);
    } else {
      // All files were invalid — clear previous selection
      handleClearFile();
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      if (allowMultiplePDFs) {
        handleMultipleFiles(files);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const file = files[0];
      const error = validateFile(file);

      if (error) {
        alert(error);
        return;
      }

      setSelectedFile(file);
      setSelectedFiles([]);

      // Reset input so re-selecting the same file via click works
      if (fileInputRef.current) fileInputRef.current.value = '';

      // If no upload button, auto-submit
      if (!showUploadButton) {
        onFileSelect(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      if (allowMultiplePDFs) {
        handleMultipleFiles(files);
        e.target.value = '';
        return;
      }

      const file = files[0];
      const error = validateFile(file);

      if (error) {
        alert(error);
        e.target.value = '';
        return;
      }

      setSelectedFile(file);
      setSelectedFiles([]);

      // Reset input so re-selecting the same file triggers onChange
      e.target.value = '';

      // If no upload button, auto-submit
      if (!showUploadButton) {
        onFileSelect(file);
      }
    }
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleUploadClick = () => {
    if (disabled) return;
    if (selectedFiles.length > 1 && onMultiFileSelect) {
      onMultiFileSelect(selectedFiles);
    } else if (selectedFile) {
      onFileSelect(selectedFile);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    const updated = selectedFiles.filter((_, i) => i !== index);
    if (updated.length === 1) {
      setSelectedFile(updated[0]);
      setSelectedFiles([]);
    } else if (updated.length === 0) {
      handleClearFile();
    } else {
      setSelectedFiles(updated);
    }
  };

  return (
    <div className="file-uploader">
      <label className="file-uploader-label">{label}</label>

      <div
        className={`file-uploader-dropzone ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes}
          onChange={handleFileChange}
          style={{ display: 'none' }}
          disabled={disabled}
          multiple={allowMultiplePDFs}
        />

        <div className="file-uploader-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
        </div>

        {selectedFiles.length > 1 ? (
          <div className="file-uploader-selected">
            <p className="file-type-badge">📄 {selectedFiles.length} PDFs selected (batch)</p>
            <div className="multi-file-list">
              {selectedFiles.map((f, i) => (
                <div key={i} className="multi-file-item">
                  <span className="multi-file-name">{f.name}</span>
                  <span className="multi-file-size">{formatFileSize(f.size)}</span>
                  <button
                    type="button"
                    className="multi-file-remove"
                    onClick={(e) => { e.stopPropagation(); handleRemoveFile(i); }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : selectedFile ? (
          <div className="file-uploader-selected">
            <p className="file-name">{selectedFile.name}</p>
            <p className="file-size">{formatFileSize(selectedFile.size)}</p>
            <p className="file-type-badge">
              {selectedFile.name.toLowerCase().endsWith('.pdf') ? '📄 Single PDF' : '📦 Batch ZIP'}
            </p>
          </div>
        ) : (
          <div className="file-uploader-text">
            <p className="primary-text">
              {isDragging ? 'Drop files here' : 'Drag and drop your files here'}
            </p>
            <p className="secondary-text">or click to browse</p>
            <p className="file-types">
              Accepted: PDF (single or multiple reports, max 50MB each) or ZIP (batch, max 200MB)
            </p>
          </div>
        )}
      </div>

      {/* Upload Button - shown when file is selected and showUploadButton is true */}
      {showUploadButton && (selectedFile || selectedFiles.length > 1) && (
        <div className="file-uploader-actions">
          <button
            className="upload-button"
            onClick={handleUploadClick}
            disabled={disabled}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            Upload & Analyze
          </button>
          <button
            className="clear-button"
            onClick={handleClearFile}
            disabled={disabled}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
