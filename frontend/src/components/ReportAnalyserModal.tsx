import { useState, useEffect, useCallback } from 'react';
import ReportAnalyser from '../pages/ReportAnalyser';
import './ReportAnalyserModal.css';

interface ReportAnalyserModalProps {
  onClose: () => void;
}

export default function ReportAnalyserModal({ onClose }: ReportAnalyserModalProps) {
  const [hasUnsavedWork, setHasUnsavedWork] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const handleClose = useCallback(() => {
    if (hasUnsavedWork) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  }, [hasUnsavedWork, onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  return (
    <>
      <div className="modal-backdrop" onClick={handleClose}>
        <div className="report-analyser-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Report Analyser</h2>
            <button className="modal-close" onClick={handleClose}>&times;</button>
          </div>
          <div className="modal-body">
            <ReportAnalyser embedded />
          </div>
        </div>
      </div>

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
