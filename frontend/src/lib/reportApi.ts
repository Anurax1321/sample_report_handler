import api from './api';

export interface ReportFile {
  id: number;
  filename: string;
  file_type: 'AA' | 'AC' | 'AC_EXT' | 'EXCEL';
  file_size: number;
}

export interface SampleBrief {
  id: number;
  sample_code: string;
  patient_id: string;
}

export interface Report {
  id: number;
  sample_id: number | null;
  upload_date: string;
  uploaded_by: string;
  num_patients: number | null;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message: string;
  output_directory: string;
  date_code: string;
  files: ReportFile[];
  samples: SampleBrief[];
}

export interface CompoundValue {
  value: number | null;
  color: 'green' | 'yellow' | 'red' | 'none';
}

export interface ProcessedDataRow {
  sample_name: string;
  is_control_1: boolean;
  is_control_2: boolean;
  is_patient: boolean;
  values: Record<string, CompoundValue>;
}

export interface StructuredDataFrame {
  columns: string[];
  data: (string | number | null)[][];
}

export interface ProcessedReportData {
  date_code: string;
  patient_count: number;
  patient_names: string[];
  compounds: string[];
  reference_ranges: {
    patient: Record<string, [number, number]>;
    control_1: Record<string, [number, number]>;
    control_2: Record<string, [number, number]>;
    ratios: Record<string, [number, number]>;
    biochemical: Record<string, [number, number]>;
  };
  processed_data: ProcessedDataRow[];
  structured_dataframes: {
    control_1: StructuredDataFrame;
    control_2: StructuredDataFrame;
    patients: StructuredDataFrame;
  };
}

export interface GeneratedPdf {
  id: number;
  filename: string;
  file_size: number;
  patient_name: string;
}

export interface ApproveResult {
  pdf_count: number;
  zip_filename: string;
  generated_pdfs: GeneratedPdf[];
}

/**
 * Upload report files and process them
 */
export async function uploadReport(
  file1: File,
  file2: File,
  file3: File,
  uploadedBy: string = 'anonymous',
  sampleIds?: number[]
): Promise<Report> {
  const formData = new FormData();
  formData.append('uploaded_by', uploadedBy);
  if (sampleIds && sampleIds.length > 0) {
    formData.append('sample_ids', JSON.stringify(sampleIds));
  }
  formData.append('file1', file1);
  formData.append('file2', file2);
  formData.append('file3', file3);

  const response = await api.post<Report>('/reports/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
}

/**
 * Upload an Excel report file and process it
 */
export async function uploadExcelReport(
  file: File,
  uploadedBy: string = 'anonymous',
  sampleIds?: number[]
): Promise<Report> {
  const formData = new FormData();
  formData.append('uploaded_by', uploadedBy);
  if (sampleIds && sampleIds.length > 0) {
    formData.append('sample_ids', JSON.stringify(sampleIds));
  }
  formData.append('file', file);

  const response = await api.post<Report>('/reports/upload-excel', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
}

/**
 * Get all reports, optionally filtered by sample_id
 */
export async function getReports(sampleId?: number): Promise<Report[]> {
  const params = sampleId ? { sample_id: sampleId } : {};
  const response = await api.get<Report[]>('/reports', { params });
  return response.data;
}

/**
 * Get a specific report by ID
 */
export async function getReport(reportId: number): Promise<Report> {
  const response = await api.get<Report>(`/reports/${reportId}`);
  return response.data;
}

/**
 * Download report ZIP file
 */
export async function downloadReport(reportId: number, dateCode: string): Promise<void> {
  const response = await api.get(`/reports/${reportId}/download`, {
    responseType: 'blob',
  });

  // Create download link
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `report_${reportId}_${dateCode}.zip`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

/**
 * Delete a report
 */
export async function deleteReport(reportId: number): Promise<void> {
  await api.delete(`/reports/${reportId}`);
}

/**
 * Get processed data for a report (for review page)
 */
export async function getProcessedData(reportId: number): Promise<ProcessedReportData> {
  const response = await api.get<ProcessedReportData>(`/reports/${reportId}/processed-data`);
  return response.data;
}

/**
 * Approve a report with edited data and generate PDF
 */
export async function approveReport(
  reportId: number,
  editedData: Record<string, number>,
  editedNames?: Record<number, string>
): Promise<ApproveResult> {
  const response = await api.post<ApproveResult>(`/reports/${reportId}/approve`, {
    edited_data: editedData,
    edited_names: editedNames || {},
  });
  return response.data;
}

/**
 * Download generated PDF for a report
 */
export async function downloadPDF(reportId: number, filename: string): Promise<void> {
  const response = await api.get(`/reports/${reportId}/download-pdf`, {
    responseType: 'blob',
  });

  // Create download link
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

/**
 * Download the review grid as an Excel file with colors and reference ranges
 */
export async function downloadExcel(reportId: number, dateCode: string, editedData?: Record<string, number>): Promise<void> {
  const response = await api.post(`/reports/${reportId}/download-excel`, editedData || {}, {
    responseType: 'blob',
  });

  // Create download link
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `report_${reportId}_${dateCode}_review.xlsx`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
