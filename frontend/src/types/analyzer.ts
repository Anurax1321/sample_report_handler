/**
 * TypeScript types for Neonatal Report Analyzer
 */

export interface PatientInfo {
  name?: string;
  age_gender?: string;
  uhid?: string;
  referred_by?: string;
  collected_on?: string;
  received_on?: string;
  reported_on?: string;
}

export interface BiochemicalParam {
  parameter: string;
  result: string;
  method: string;
}

export interface TestResult {
  analyte: string;
  value: number;
  reference_range: string;
  unit: string;
  is_normal?: boolean;
  validation_reason?: string;
}

export interface TestRatio {
  ratio: string;
  value: number;
  reference_range: string;
  is_normal?: boolean;
  validation_reason?: string;
}

export interface Abnormality {
  category: string;
  analyte: string;
  value: number;
  reference_range: string;
  reason: string;
  unit: string;
}

export interface AnalysisSummary {
  total_tests: number;
  normal_count: number;
  abnormal_count: number;
  status: 'normal' | 'abnormal';
}

export interface AnalysisResult {
  file_name: string;
  patient_info: PatientInfo;
  biochemical_params: BiochemicalParam[];
  amino_acids: TestResult[];
  amino_acid_ratios: TestRatio[];
  acylcarnitines: TestResult[];
  acylcarnitine_ratios: TestRatio[];
  abnormalities: Abnormality[];
  summary: AnalysisSummary;
}

export interface SingleAnalysisResponse {
  success: boolean;
  message: string;
  result?: AnalysisResult;
  error?: string;
}

export interface FailedReport {
  path: string;
  error: string;
}

export interface BatchAnalysisResponse {
  success: boolean;
  message: string;
  total: number;
  successful: number;
  failed: number;
  normal: number;
  abnormal: number;
  normal_reports: AnalysisResult[];
  abnormal_reports: AnalysisResult[];
  failed_reports: FailedReport[];
}
