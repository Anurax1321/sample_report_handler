import { useState } from 'react';
import FileUploader from '../components/analyzer/FileUploader';
import AnalysisResults from '../components/analyzer/AnalysisResults';
import BatchDashboard from '../components/analyzer/BatchDashboard';
import { analyzeSinglePDF, analyzeBatchPDFs } from '../services/analyzerApi';
import type { AnalysisResult, BatchAnalysisResponse } from '../types/analyzer';
import './PageLayout.css';
import './ReportAnalyser.css';

export default function ReportAnalyser() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [batchResult, setBatchResult] = useState<BatchAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  const handleFileSelect = async (file: File) => {
    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);
    setBatchResult(null);

    try {
      // Auto-detect file type
      const isPDF = file.name.toLowerCase().endsWith('.pdf');
      const isZIP = file.name.toLowerCase().endsWith('.zip');

      if (!isPDF && !isZIP) {
        setError('Invalid file type. Please upload a PDF or ZIP file.');
        setIsAnalyzing(false);
        return;
      }

      if (isPDF) {
        // Single PDF analysis
        const response = await analyzeSinglePDF(file);

        if (response.success && response.result) {
          setAnalysisResult(response.result);
        } else {
          setError(response.error || 'Analysis failed');
        }
      } else {
        // Batch ZIP analysis
        const response = await analyzeBatchPDFs(file);

        if (response.success) {
          setBatchResult(response);
        } else {
          setError(response.message || 'Batch analysis failed');
        }
      }
    } catch (err: any) {
      console.error('Analysis error:', err);

      // Extract error message from axios error
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Failed to analyze report. Please try again.');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setAnalysisResult(null);
    setBatchResult(null);
    setError(null);
  };

  return (
    <main className="page-layout">
      <div className="page-container">
        <div className="page-header">
          <div className="header-left">
            {(analysisResult || batchResult) && (
              <button className="reset-button" onClick={handleReset}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="1 4 1 10 7 10"></polyline>
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                </svg>
                Analyze New Report
              </button>
            )}
          </div>
          <div className="header-right">
            <button className="help-button" onClick={() => setShowInstructions(!showInstructions)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              How to Use
            </button>
          </div>
        </div>

        <div className="page-content">
          {/* Upload Section - Show when no results */}
          {!analysisResult && !batchResult && (
            <>
              {/* File Uploader - Shown First */}
              <FileUploader
                onFileSelect={handleFileSelect}
                acceptedTypes=".pdf,.zip"
                maxSizeMB={200}
                label="Upload Report File"
                disabled={isAnalyzing}
              />

              {isAnalyzing && (
                <div className="analyzing-status">
                  <div className="spinner"></div>
                  <h3>Analyzing Report...</h3>
                  <p>Please wait while we extract and validate test parameters</p>
                </div>
              )}

              {error && (
                <div className="error-message">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <div>
                    <h4>Analysis Failed</h4>
                    <p>{error}</p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Instructions Panel - Toggle with button */}
          {showInstructions && (
            <div className="info-panel">
              <div className="info-panel-header">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <h4>How to Use</h4>
              </div>
              <div className="info-section">
                <h5>📤 Upload Your Files</h5>
                <ul>
                  <li><strong>Single PDF:</strong> Upload one report file (max 50MB)</li>
                  <li><strong>Batch ZIP:</strong> Upload a ZIP containing multiple PDF reports (max 200MB)</li>
                  <li>The system <strong>automatically detects</strong> the file type and processes accordingly</li>
                </ul>
              </div>
              <div className="info-section">
                <h5>🔍 What Gets Analyzed</h5>
                <ul>
                  <li>Patient information and demographics</li>
                  <li>68+ test parameters (amino acids, acylcarnitines, ratios)</li>
                  <li>Validation against medical reference ranges</li>
                  <li>Automatic identification of abnormalities</li>
                </ul>
              </div>
              <div className="info-section">
                <h5>📊 Export Results</h5>
                <ul>
                  <li>Download comprehensive reports in Excel or HTML format</li>
                  <li>Color-coded abnormalities for easy review</li>
                  <li>Complete test summaries with reference ranges</li>
                </ul>
              </div>
            </div>
          )}

          {/* Single PDF Results */}
          {analysisResult && !isAnalyzing && (
            <AnalysisResults result={analysisResult} />
          )}

          {/* Batch Results */}
          {batchResult && !isAnalyzing && (
            <BatchDashboard batchResult={batchResult} onReset={handleReset} />
          )}
        </div>
      </div>
    </main>
  );
}
