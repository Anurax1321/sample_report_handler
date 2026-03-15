/**
 * API service for Neonatal Report Analyzer
 */

import api from '../lib/api';
import type { SingleAnalysisResponse, BatchAnalysisResponse, AnalysisResult } from '../types/analyzer';

const ANALYZER_PREFIX = '/api/analyzer';

// Timeout configurations (in milliseconds)
const SINGLE_PDF_TIMEOUT = 120000; // 2 minutes for single PDF
const BATCH_ZIP_TIMEOUT = 600000;  // 10 minutes for batch ZIP processing

/**
 * Upload and analyze a single PDF report
 */
export const analyzeSinglePDF = async (file: File): Promise<SingleAnalysisResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post<SingleAnalysisResponse>(
    `${ANALYZER_PREFIX}/analyze-pdf`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: SINGLE_PDF_TIMEOUT,
    }
  );

  return response.data;
};

/**
 * Upload and analyze a batch of PDF reports from a ZIP file
 */
export const analyzeBatchPDFs = async (file: File): Promise<BatchAnalysisResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post<BatchAnalysisResponse>(
    `${ANALYZER_PREFIX}/analyze-batch`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: BATCH_ZIP_TIMEOUT,
    }
  );

  return response.data;
};

/**
 * Health check for analyzer service
 */
export const checkAnalyzerHealth = async (): Promise<{ status: string; service: string }> => {
  const response = await api.get(`${ANALYZER_PREFIX}/health`);
  return response.data;
};

/**
 * Export analysis result to Excel
 */
export const exportToExcel = async (analysisResult: AnalysisResult): Promise<Blob> => {
  const response = await api.post(
    `${ANALYZER_PREFIX}/export/excel`,
    analysisResult,
    {
      responseType: 'blob',
    }
  );

  return response.data;
};

/**
 * Export analysis result to HTML
 */
export const exportToHTML = async (analysisResult: AnalysisResult): Promise<Blob> => {
  const response = await api.post(
    `${ANALYZER_PREFIX}/export/html`,
    analysisResult,
    {
      responseType: 'blob',
    }
  );

  return response.data;
};
