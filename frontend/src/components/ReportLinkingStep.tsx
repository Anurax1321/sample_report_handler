import { useState, useEffect, useMemo } from 'react';
import type { ApproveResult, GeneratedPdf } from '../lib/reportApi';
import { searchSamples, linkPdfToSample } from '../lib/sampleApi';
import type { Sample } from '../lib/sampleApi';
import './ReportLinkingStep.css';

interface ReportLinkingStepProps {
  approveResult: ApproveResult;
  onComplete: () => void;
  onCreateSample: (prefillData: { patient_name: string }) => void;
}

interface PdfMatchState {
  matches: Sample[];
  loading: boolean;
  selectedSampleId: number | null;
  linked: boolean;
  linking: boolean;
}

export default function ReportLinkingStep({ approveResult, onComplete, onCreateSample }: ReportLinkingStepProps) {
  const [showConfetti, setShowConfetti] = useState(true);
  const [pdfStates, setPdfStates] = useState<Record<number, PdfMatchState>>({});

  // Generate confetti pieces
  const confettiPieces = useMemo(() => {
    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#0d9488', '#f97316'];
    return Array.from({ length: 28 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 1.5}s`,
      duration: `${2 + Math.random() * 1.5}s`,
      color: colors[i % colors.length],
      size: `${6 + Math.random() * 6}px`,
      rotation: `${Math.random() * 360}deg`,
    }));
  }, []);

  // Auto-hide confetti after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Search for matching samples on mount
  useEffect(() => {
    const pdfs = approveResult.generated_pdfs || [];
    if (pdfs.length === 0) return;

    // Initialize states
    const initialStates: Record<number, PdfMatchState> = {};
    pdfs.forEach((pdf) => {
      initialStates[pdf.id] = {
        matches: [],
        loading: true,
        selectedSampleId: null,
        linked: false,
        linking: false,
      };
    });
    setPdfStates(initialStates);

    // Search for each PDF
    pdfs.forEach(async (pdf) => {
      try {
        const matches = await searchSamples(pdf.patient_name);
        setPdfStates((prev) => ({
          ...prev,
          [pdf.id]: {
            ...prev[pdf.id],
            matches,
            loading: false,
          },
        }));
      } catch {
        setPdfStates((prev) => ({
          ...prev,
          [pdf.id]: {
            ...prev[pdf.id],
            matches: [],
            loading: false,
          },
        }));
      }
    });
  }, [approveResult.generated_pdfs]);

  const handleSelectSample = (pdfId: number, sampleId: number) => {
    setPdfStates((prev) => ({
      ...prev,
      [pdfId]: {
        ...prev[pdfId],
        selectedSampleId: prev[pdfId].selectedSampleId === sampleId ? null : sampleId,
      },
    }));
  };

  const handleLink = async (pdfId: number) => {
    const state = pdfStates[pdfId];
    if (!state || !state.selectedSampleId) return;

    setPdfStates((prev) => ({
      ...prev,
      [pdfId]: { ...prev[pdfId], linking: true },
    }));

    try {
      await linkPdfToSample(state.selectedSampleId, pdfId);
      setPdfStates((prev) => ({
        ...prev,
        [pdfId]: { ...prev[pdfId], linked: true, linking: false },
      }));
    } catch (err: any) {
      console.error('Error linking PDF to sample:', err);
      alert(err.response?.data?.detail || 'Failed to link PDF to sample');
      setPdfStates((prev) => ({
        ...prev,
        [pdfId]: { ...prev[pdfId], linking: false },
      }));
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const linkedCount = Object.values(pdfStates).filter((s) => s.linked).length;
  const totalPdfs = approveResult.generated_pdfs?.length || 0;

  return (
    <div className="report-linking-step">
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="confetti-container">
          {confettiPieces.map((piece) => (
            <span
              key={piece.id}
              className="confetti-piece"
              style={{
                left: piece.left,
                animationDelay: piece.delay,
                animationDuration: piece.duration,
                backgroundColor: piece.color,
                width: piece.size,
                height: piece.size,
                transform: `rotate(${piece.rotation})`,
              }}
            />
          ))}
        </div>
      )}

      {/* Success Banner */}
      <div className="success-banner">
        <div className="success-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <div className="success-text">
          <h3>Report approved!</h3>
          <p>{approveResult.pdf_count} PDF{approveResult.pdf_count !== 1 ? 's' : ''} generated and downloaded.</p>
        </div>
      </div>

      {/* PDF Linking Section */}
      {totalPdfs > 0 && (
        <div className="pdf-link-section">
          <h3 className="pdf-link-title">
            Link PDFs to Samples
            {linkedCount > 0 && (
              <span className="linked-counter">{linkedCount}/{totalPdfs} linked</span>
            )}
          </h3>
          <p className="pdf-link-description">
            Match each generated PDF to an existing sample, or create a new sample.
          </p>

          <div className="pdf-link-list">
            {approveResult.generated_pdfs.map((pdf: GeneratedPdf) => {
              const state = pdfStates[pdf.id];
              return (
                <div key={pdf.id} className={`pdf-link-card ${state?.linked ? 'linked' : ''}`}>
                  <div className="pdf-link-card-header">
                    <div className="pdf-info">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                      </svg>
                      <div>
                        <span className="pdf-filename">{pdf.filename}</span>
                        <span className="pdf-meta">
                          {pdf.patient_name} &middot; {formatFileSize(pdf.file_size)}
                        </span>
                      </div>
                    </div>
                    {state?.linked && (
                      <span className="linked-badge">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Linked
                      </span>
                    )}
                  </div>

                  {!state?.linked && (
                    <div className="pdf-link-card-body">
                      {state?.loading ? (
                        <div className="match-loading">
                          <div className="match-spinner"></div>
                          <span>Searching for matching samples...</span>
                        </div>
                      ) : state && state.matches.length > 0 ? (
                        <div className="sample-matches">
                          <span className="match-label">
                            {state.matches.length} matching sample{state.matches.length !== 1 ? 's' : ''} found:
                          </span>
                          <div className="sample-match-list">
                            {state.matches.map((sample) => (
                              <div
                                key={sample.id}
                                className={`sample-match ${state.selectedSampleId === sample.id ? 'selected' : ''}`}
                                onClick={() => handleSelectSample(pdf.id, sample.id)}
                              >
                                <div className="sample-match-radio">
                                  <div className={`radio-dot ${state.selectedSampleId === sample.id ? 'active' : ''}`} />
                                </div>
                                <div className="sample-match-info">
                                  <span className="sample-match-code">{sample.sample_code}</span>
                                  <span className="sample-match-detail">
                                    {sample.patient_id}
                                    {sample.from_hospital && <> &middot; {sample.from_hospital}</>}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                          <button
                            className="btn-link-to-sample"
                            disabled={!state.selectedSampleId || state.linking}
                            onClick={() => handleLink(pdf.id)}
                          >
                            {state.linking ? 'Linking...' : 'Link to Selected Sample'}
                          </button>
                        </div>
                      ) : (
                        <div className="no-match-area">
                          <span className="no-match-message">No matching sample found for "{pdf.patient_name}"</span>
                          <button
                            className="btn-create-sample"
                            onClick={() => onCreateSample({ patient_name: pdf.patient_name })}
                          >
                            + Create New Sample
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Done Button */}
      <div className="linking-step-actions">
        <button className="btn-done" onClick={onComplete}>
          Done
        </button>
      </div>
    </div>
  );
}
