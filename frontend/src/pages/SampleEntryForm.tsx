import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SampleEntryForm.css';

interface SampleFormData {
  sample_code: string;
  test_type: string;
  collected_at: string;
  collected_by: string;
  priority: 'low' | 'normal' | 'high';
  notes: string;
  patient_name: string;
  patient_age: string;
  patient_gender: string;
  hospital_name: string;
  doctor_name: string;
}

export default function SampleEntryForm() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<SampleFormData>({
    sample_code: '',
    test_type: 'NBS - Newborn Screening',
    collected_at: new Date().toISOString().slice(0, 16),
    collected_by: '',
    priority: 'normal',
    notes: '',
    patient_name: '',
    patient_age: '',
    patient_gender: '',
    hospital_name: '',
    doctor_name: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.sample_code || !formData.collected_by || !formData.patient_name) {
      alert('Please fill in all required fields (Sample Code, Collected By, Patient Name)');
      return;
    }

    setSubmitting(true);

    try {
      // Prepare data for API
      const apiData = {
        sample_code: formData.sample_code,
        test_type: formData.test_type,
        collected_at: formData.collected_at,
        collected_by: formData.collected_by,
        priority: formData.priority,
        notes: formData.notes,
        sample_metadata: {
          patient_name: formData.patient_name,
          patient_age: formData.patient_age,
          patient_gender: formData.patient_gender,
          hospital_name: formData.hospital_name,
          doctor_name: formData.doctor_name,
        }
      };

      const response = await fetch('http://localhost:8000/samples', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create sample');
      }

      const result = await response.json();
      alert(`Sample created successfully! Sample Code: ${result.sample_code}`);

      // Reset form
      setFormData({
        sample_code: '',
        test_type: 'NBS - Newborn Screening',
        collected_at: new Date().toISOString().slice(0, 16),
        collected_by: '',
        priority: 'normal',
        notes: '',
        patient_name: '',
        patient_age: '',
        patient_gender: '',
        hospital_name: '',
        doctor_name: '',
      });

      // Navigate to tracking page
      navigate('/sample-entry/tracking');
    } catch (error: any) {
      console.error('Error creating sample:', error);
      alert(error.message || 'Failed to create sample');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="sample-entry-form-page">
      <div className="form-container">
        <form onSubmit={handleSubmit} className="sample-form">
          {/* Sample Information Section */}
          <div className="form-section">
            <h2 className="section-title">Sample Information</h2>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="sample_code">Sample Code *</label>
                <input
                  type="text"
                  id="sample_code"
                  name="sample_code"
                  value={formData.sample_code}
                  onChange={handleChange}
                  placeholder="e.g., NBS2024-001"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="test_type">Test Type</label>
                <select
                  id="test_type"
                  name="test_type"
                  value={formData.test_type}
                  onChange={handleChange}
                >
                  <option value="NBS - Newborn Screening">NBS - Newborn Screening</option>
                  <option value="NBS - Metabolic Screening">NBS - Metabolic Screening</option>
                  <option value="NBS - Extended Panel">NBS - Extended Panel</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="collected_at">Collection Date & Time</label>
                <input
                  type="datetime-local"
                  id="collected_at"
                  name="collected_at"
                  value={formData.collected_at}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="collected_by">Collected By *</label>
                <input
                  type="text"
                  id="collected_by"
                  name="collected_by"
                  value={formData.collected_by}
                  onChange={handleChange}
                  placeholder="Staff name"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="priority">Priority</label>
                <select
                  id="priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
          </div>

          {/* Patient Information Section */}
          <div className="form-section">
            <h2 className="section-title">Patient Information</h2>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="patient_name">Patient Name *</label>
                <input
                  type="text"
                  id="patient_name"
                  name="patient_name"
                  value={formData.patient_name}
                  onChange={handleChange}
                  placeholder="Full name"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="patient_age">Patient Age</label>
                <input
                  type="text"
                  id="patient_age"
                  name="patient_age"
                  value={formData.patient_age}
                  onChange={handleChange}
                  placeholder="e.g., 2 days, 1 week"
                />
              </div>

              <div className="form-group">
                <label htmlFor="patient_gender">Gender</label>
                <select
                  id="patient_gender"
                  name="patient_gender"
                  value={formData.patient_gender}
                  onChange={handleChange}
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="hospital_name">Hospital Name</label>
                <input
                  type="text"
                  id="hospital_name"
                  name="hospital_name"
                  value={formData.hospital_name}
                  onChange={handleChange}
                  placeholder="Hospital or clinic name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="doctor_name">Doctor Name</label>
                <input
                  type="text"
                  id="doctor_name"
                  name="doctor_name"
                  value={formData.doctor_name}
                  onChange={handleChange}
                  placeholder="Referring physician"
                />
              </div>
            </div>
          </div>

          {/* Notes Section */}
          <div className="form-section">
            <h2 className="section-title">Additional Notes</h2>
            <div className="form-group full-width">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Any additional information or special instructions"
                rows={4}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/sample-entry')}
              className="btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Creating Sample...' : 'Create Sample'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
