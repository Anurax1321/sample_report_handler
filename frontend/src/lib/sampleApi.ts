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

export interface UpdateStatusData {
  status: 'received' | 'processing' | 'completed' | 'rejected';
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
 * Generate next available sample code
 */
export async function generateSampleCode(): Promise<{ sample_code: string }> {
  const response = await api.get<{ sample_code: string }>('/samples/generate-code');
  return response.data;
}
