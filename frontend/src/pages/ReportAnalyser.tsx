import { useState } from 'react';
import FileUploader from '../components/analyzer/FileUploader';
import AnalysisResults from '../components/analyzer/AnalysisResults';
import BatchDashboard from '../components/analyzer/BatchDashboard';
import { analyzeSinglePDF, analyzeBatchPDFs } from '../services/analyzerApi';
import type { AnalysisResult, BatchAnalysisResponse } from '../types/analyzer';
import './PageLayout.css';
import './ReportAnalyser.css';

export default function ReportAnalyser() {
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [batchResult, setBatchResult] = useState<BatchAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (file: File) => {
    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const response = await analyzeSinglePDF(file);

      if (response.success && response.result) {
        setAnalysisResult(response.result);
      } else {
        setError(response.error || 'Analysis failed');
      }
    } catch (err: any) {
      console.error('Analysis error:', err);

      // Extract error message from axios error
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Failed to analyze report. Please try again.');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleBatchFileSelect = async (file: File) => {
    setIsAnalyzing(true);
    setError(null);
    setBatchResult(null);

    try {
      const response = await analyzeBatchPDFs(file);

      if (response.success) {
        setBatchResult(response);
      } else {
        setError(response.message || 'Batch analysis failed');
      }
    } catch (err: any) {
      console.error('Batch analysis error:', err);

      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Failed to analyze batch. Please try again.');
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

  const handleModeChange = (newMode: 'single' | 'batch') => {
    setMode(newMode);
    handleReset();
  };

  return (
    <main className="page-layout">
      <div className="page-container">
        <div className="page-header">
          <div className="header-content">
            <h1 className="page-title">Neonatal Report Analyzer</h1>
            <p className="page-description">
              Upload neonatal screening PDF reports for comprehensive analysis and validation
            </p>
          </div>
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

        {/* Mode Toggle */}
        {!analysisResult && !batchResult && (
          <div className="mode-toggle">
            <button
              className={`mode-button ${mode === 'single' ? 'active' : ''}`}
              onClick={() => handleModeChange('single')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              Single PDF
            </button>
            <button
              className={`mode-button ${mode === 'batch' ? 'active' : ''}`}
              onClick={() => handleModeChange('batch')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 7h-3a2 2 0 0 1-2-2V2"></path>
                <path d="M9 18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3m11 13v-3.5a3.5 3.5 0 0 0-7 0V18a2 2 0 0 0 2 2h3a2 2 0 0 0 2-2z"></path>
              </svg>
              Batch ZIP
            </button>
          </div>
        )}

        <div className="page-content">
          {/* Upload Section - Show when no results */}
          {!analysisResult && !batchResult && (
            <>
              <FileUploader
                onFileSelect={mode === 'single' ? handleFileSelect : handleBatchFileSelect}
                acceptedTypes={mode === 'single' ? '.pdf' : '.zip'}
                maxSizeMB={mode === 'single' ? 50 : 200}
                label={mode === 'single' ? 'Upload PDF Report' : 'Upload ZIP File with Multiple PDFs'}
                disabled={isAnalyzing}
              />

              {isAnalyzing && (
                <div className="analyzing-status">
                  <div className="spinner"></div>
                  <h3>{mode === 'single' ? 'Analyzing Report...' : 'Analyzing Batch...'}</h3>
                  <p>
                    {mode === 'single'
                      ? 'Please wait while we extract and validate test parameters'
                      : 'Please wait while we process all PDF files in the ZIP'}
                  </p>
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

              <div className="info-panel">
                <div className="info-panel-header">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                  <h4>What This Tool Does</h4>
                </div>
                <ul>
                  <li>Extracts patient information and demographics</li>
                  <li>Parses 68+ test parameters (amino acids, acylcarnitines, ratios)</li>
                  <li>Validates values against reference ranges</li>
                  <li>Identifies and highlights abnormalities</li>
                  <li>Provides comprehensive analysis summary</li>
                  {mode === 'batch' && (
                    <li><strong>Batch Mode:</strong> Process multiple PDF files at once from a ZIP archive</li>
                  )}
                </ul>
              </div>
            </>
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
