/**
 * API service for Neonatal Report Analyzer
 */

import axios from 'axios';
import type { SingleAnalysisResponse, BatchAnalysisResponse, AnalysisResult } from '../types/analyzer';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const ANALYZER_URL = `${API_BASE_URL}/api/analyzer`;

/**
 * Upload and analyze a single PDF report
 */
export const analyzeSinglePDF = async (file: File): Promise<SingleAnalysisResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post<SingleAnalysisResponse>(
    `${ANALYZER_URL}/analyze-pdf`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
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

  const response = await axios.post<BatchAnalysisResponse>(
    `${ANALYZER_URL}/analyze-batch`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return response.data;
};

/**
 * Health check for analyzer service
 */
export const checkAnalyzerHealth = async (): Promise<{ status: string; service: string }> => {
  const response = await axios.get(`${ANALYZER_URL}/health`);
  return response.data;
};

/**
 * Export analysis result to Excel
 */
export const exportToExcel = async (analysisResult: AnalysisResult): Promise<Blob> => {
  const response = await axios.post(
    `${ANALYZER_URL}/export/excel`,
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
  const response = await axios.post(
    `${ANALYZER_URL}/export/html`,
    analysisResult,
    {
      responseType: 'blob',
    }
  );

  return response.data;
};
