import { useState, useRef } from 'react';
import './FileUploader.css';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  acceptedTypes: string;
  maxSizeMB?: number;
  label: string;
  disabled?: boolean;
}

export default function FileUploader({
  onFileSelect,
  acceptedTypes,
  maxSizeMB = 50,
  label,
  disabled = false
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
    // Check file type
    const fileExtension = file.name.toLowerCase().split('.').pop();
    const acceptedExtensions = acceptedTypes.split(',').map(t => t.trim().replace('.', ''));

    if (!acceptedExtensions.includes(fileExtension || '')) {
      return `Invalid file type. Accepted types: ${acceptedTypes}`;
    }

    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      return `File size exceeds ${maxSizeMB}MB limit`;
    }

    return null;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const error = validateFile(file);

      if (error) {
        alert(error);
        return;
      }

      setSelectedFile(file);
      onFileSelect(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const error = validateFile(file);

      if (error) {
        alert(error);
        e.target.value = '';
        return;
      }

      setSelectedFile(file);
      onFileSelect(file);
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
        />

        <div className="file-uploader-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
        </div>

        {selectedFile ? (
          <div className="file-uploader-selected">
            <p className="file-name">{selectedFile.name}</p>
            <p className="file-size">{formatFileSize(selectedFile.size)}</p>
          </div>
        ) : (
          <div className="file-uploader-text">
            <p className="primary-text">
              {isDragging ? 'Drop file here' : 'Drag and drop file here'}
            </p>
            <p className="secondary-text">or click to browse</p>
            <p className="file-types">Accepted: {acceptedTypes} (max {maxSizeMB}MB)</p>
          </div>
        )}
      </div>
    </div>
  );
}
