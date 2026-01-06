import type { PatientInfo } from '../../types/analyzer';
import './PatientInfoCard.css';

interface PatientInfoCardProps {
  patientInfo: PatientInfo;
  fileName: string;
}

export default function PatientInfoCard({ patientInfo, fileName }: PatientInfoCardProps) {
  const formatLabel = (key: string): string => {
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const infoEntries = Object.entries(patientInfo).filter(([_, value]) => value);

  return (
    <div className="patient-info-card">
      <div className="patient-info-header">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
        <h3>Patient Information</h3>
      </div>

      <div className="patient-info-content">
        <div className="info-row">
          <span className="info-label">Report File:</span>
          <span className="info-value">{fileName}</span>
        </div>

        {infoEntries.map(([key, value]) => (
          <div key={key} className="info-row">
            <span className="info-label">{formatLabel(key)}:</span>
            <span className="info-value">{value}</span>
          </div>
        ))}

        {infoEntries.length === 0 && (
          <div className="no-info">
            <p>No patient information found in report</p>
          </div>
        )}
      </div>
    </div>
  );
}
