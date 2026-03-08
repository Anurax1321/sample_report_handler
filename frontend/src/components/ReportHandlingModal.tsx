import { useState, useEffect, useCallback } from 'react';
import ReportHandling from '../pages/ReportHandling';
import ReportReview from '../pages/ReportReview';
import './ReportHandlingModal.css';

interface ReportHandlingModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ReportHandlingModal({ onClose, onSuccess }: ReportHandlingModalProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [reportId, setReportId] = useState<number | null>(null);
  const [hasUnsavedWork, setHasUnsavedWork] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const handleClose = useCallback(() => {
    if (hasUnsavedWork) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  }, [hasUnsavedWork, onClose]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  const handleUploadSuccess = (id: number) => {
    setReportId(id);
    setCurrentStep(2);
    setHasUnsavedWork(false);
  };

  const handleGoBack = () => {
    setCurrentStep(1);
    setReportId(null);
    setHasUnsavedWork(false);
  };

  const handleComplete = () => {
    onSuccess?.();
    onClose();
  };

  const handleDirtyChange = (dirty: boolean) => {
    setHasUnsavedWork(dirty);
  };

  return (
    <>
      <div className="modal-backdrop" onClick={handleClose}>
        <div
          className="report-handling-modal"
          data-step={currentStep}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="modal-header">
            <div className="modal-header-content">
              <h2>Report Handling</h2>
              <p>Upload AA, AC & AC_EXT files for processing</p>
            </div>
            <div className="modal-step-indicator">
              <div className={`step ${currentStep === 1 ? 'active' : 'completed'}`}>
                <span className="step-number">1</span>
                <span>Upload</span>
              </div>
              <div className={`step-connector ${currentStep === 2 ? 'active' : ''}`} />
              <div className={`step ${currentStep === 2 ? 'active' : ''}`}>
                <span className="step-number">2</span>
                <span>Review</span>
              </div>
            </div>
            <button className="modal-close" onClick={handleClose}>&times;</button>
          </div>

          {/* Body */}
          <div className="modal-body">
            {currentStep === 1 && (
              <ReportHandling
                embedded
                onUploadSuccess={handleUploadSuccess}
                onClose={handleClose}
                onDirtyChange={handleDirtyChange}
              />
            )}
            {currentStep === 2 && reportId !== null && (
              <ReportReview
                embedded
                reportId={String(reportId)}
                onGoBack={handleGoBack}
                onComplete={handleComplete}
                onDirtyChange={handleDirtyChange}
              />
            )}
          </div>
        </div>
      </div>

      {/* Close confirmation dialog */}
      {showCloseConfirm && (
        <div className="confirm-overlay" onClick={() => setShowCloseConfirm(false)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Unsaved Work</h3>
            <p>
              You have unsaved changes. Are you sure you want to close?
              Your progress will be lost.
            </p>
            <div className="confirm-actions">
              <button className="btn-cancel" onClick={() => setShowCloseConfirm(false)}>
                Keep Working
              </button>
              <button className="btn-discard" onClick={onClose}>
                Discard & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
