import api from './api';

export interface Sample {
  id: number;
  // Core identification (Excel fields)
  sample_code: string;  // VRL serial number
  patient_id: string;   // Sample ID (e.g., "B/O najiya 378981")

  // Sample details (Excel fields)
  age_gender: string;         // Format: "10D/F", "3D/M 2.64"
  from_hospital: string;      // Hospital/clinic name
  type_of_analysis: string;   // e.g., "BIO7", "BIO6"
  type_of_sample: string;     // e.g., "DBS" (Dried Blood Spot)

  // Dates (Excel fields)
  collection_date: string;
  reported_on: string | null;

  // Legacy/Additional fields (kept for backward compatibility)
  test_type: string;
  collected_at: string;
  collected_by: string;
  priority: 'low' | 'normal' | 'high';
  status: 'received' | 'processing' | 'completed' | 'rejected';
  notes: string;
  sample_metadata: {
    patient_name?: string;
    patient_age?: string;
    patient_gender?: string;
    hospital_name?: string;
    doctor_name?: string;
    [key: string]: any;
  };
}

export interface CreateSampleData {
  // Core identification
  sample_code: string;
  patient_id?: string;

  // Sample details
  age_gender?: string;
  from_hospital?: string;
  type_of_analysis?: string;
  type_of_sample?: string;

  // Dates
  collection_date?: string;
  reported_on?: string;

  // Legacy/Additional fields
  test_type?: string;
  collected_at?: string;
  collected_by?: string;
  priority?: 'low' | 'normal' | 'high';
  notes?: string;
  sample_metadata?: Record<string, any>;
}

export interface UpdateSampleData {
  patient_id?: string;
  age_gender?: string;
  from_hospital?: string;
  type_of_analysis?: string;
  type_of_sample?: string;
  collection_date?: string;
  reported_on?: string | null;
  notes?: string;
  sample_metadata?: Record<string, any>;
}

export interface UpdateStatusData {
  status: 'received' | 'processing' | 'completed' | 'rejected';
}

export interface UpdateReportedDateData {
  reported_on: string | null;
}

/**
 * Get all samples with optional status filter
 */
export async function getSamples(status?: string): Promise<Sample[]> {
  const params = status ? { status } : {};
  const response = await api.get<Sample[]>('/samples', { params });
  return response.data;
}

/**
 * Create a new sample
 */
export async function createSample(data: CreateSampleData): Promise<Sample> {
  const response = await api.post<Sample>('/samples', data);
  return response.data;
}

/**
 * Update sample fields (general update)
 */
export async function updateSample(sampleId: number, data: UpdateSampleData): Promise<Sample> {
  const response = await api.patch<Sample>(`/samples/${sampleId}`, data);
  return response.data;
}

/**
 * Update sample status
 */
export async function updateSampleStatus(sampleId: number, data: UpdateStatusData): Promise<Sample> {
  const response = await api.patch<Sample>(`/samples/${sampleId}/status`, data);
  return response.data;
}

/**
 * Delete a sample
 */
export async function deleteSample(sampleId: number): Promise<void> {
  await api.delete(`/samples/${sampleId}`);
}

/**
 * Update sample reported date
 */
export async function updateReportedDate(sampleId: number, data: UpdateReportedDateData): Promise<Sample> {
  const response = await api.patch<Sample>(`/samples/${sampleId}/reported-date`, data);
  return response.data;
}

/**
 * Generate next available sample code
 */
export async function generateSampleCode(): Promise<{ sample_code: string }> {
  const response = await api.get<{ sample_code: string }>('/samples/generate-code');
  return response.data;
}

/**
 * Link a report to a sample
 */
export async function linkReportToSample(sampleId: number, reportId: number): Promise<void> {
  await api.post(`/samples/${sampleId}/link-report/${reportId}`);
}

/**
 * Get unlinked reports (completed with PDFs, not attached to any sample)
 */
export async function getUnlinkedReports(): Promise<UnlinkedReport[]> {
  const response = await api.get<UnlinkedReport[]>('/reports/unlinked');
  return response.data;
}

export interface UnlinkedReport {
  id: number;
  date_code: string;
  upload_date: string;
  uploaded_by: string;
  num_patients: number | null;
  processing_status: string;
  files: { id: number; filename: string; file_type: string; file_size: number }[];
}

/**
 * Get reports linked to a sample
 */
export async function getLinkedReports(sampleId: number): Promise<UnlinkedReport[]> {
  const response = await api.get<UnlinkedReport[]>('/reports', { params: { sample_id: sampleId } });
  return response.data;
}

// --- Sample PDF types and functions ---

export interface SamplePdf {
  id: number;
  sample_id: number | null;
  filename: string;
  file_size: number;
  uploaded_at: string;
}

/**
 * Upload a PDF file (before sample exists)
 */
export async function uploadSamplePdf(file: File): Promise<SamplePdf> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post<SamplePdf>('/samples/upload-pdf', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

/**
 * Link an uploaded PDF to a sample
 */
export async function linkPdfToSample(sampleId: number, pdfId: number): Promise<void> {
  await api.post(`/samples/${sampleId}/link-pdf/${pdfId}`);
}

/**
 * Get PDFs for a sample
 */
export async function getSamplePdfs(sampleId: number): Promise<SamplePdf[]> {
  const response = await api.get<SamplePdf[]>(`/samples/${sampleId}/pdfs`);
  return response.data;
}

/**
 * Get uploaded but unlinked PDFs
 */
export async function getUnlinkedPdfs(): Promise<SamplePdf[]> {
  const response = await api.get<SamplePdf[]>('/samples/pdfs/unlinked');
  return response.data;
}

/**
 * Download a sample PDF
 */
export async function downloadSamplePdf(pdfId: number, filename: string): Promise<void> {
  const response = await api.get(`/samples/pdfs/${pdfId}/download`, {
    responseType: 'blob',
  });
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
 * Delete a sample PDF
 */
export async function deleteSamplePdf(pdfId: number): Promise<void> {
  await api.delete(`/samples/pdfs/${pdfId}`);
}
