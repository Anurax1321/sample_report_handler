import api from './api';

export interface ReportFile {
  id: number;
  filename: string;
  file_type: 'AA' | 'AC' | 'AC_EXT';
  file_size: number;
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
}

/**
 * Upload report files and process them
 */
export async function uploadReport(
  file1: File,
  file2: File,
  file3: File,
  uploadedBy: string = 'anonymous'
): Promise<Report> {
  const formData = new FormData();
  formData.append('uploaded_by', uploadedBy);
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
