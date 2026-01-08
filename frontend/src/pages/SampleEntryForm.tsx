import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateSampleCode } from '../lib/sampleApi';
import './SampleEntryForm.css';

interface SampleFormData {
  sample_code: string;         // VRL serial number
  patient_id: string;           // Sample ID (e.g., "B/O najiya 378981")
  age_gender: string;           // Format: "10D/F", "3D/M 2.64"
  from_hospital: string;        // Hospital/clinic name
  type_of_analysis: string;     // e.g., "BIO7", "BIO6"
  type_of_sample: string;       // e.g., "DBS" (Dried Blood Spot)
  collection_date: string;      // Collection date
  reported_on: string;          // Report date
  notes: string;
}

export default function SampleEntryForm() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [formData, setFormData] = useState<SampleFormData>({
    sample_code: '',
    patient_id: '',
    age_gender: '',
    from_hospital: '',
    type_of_analysis: '',
    type_of_sample: 'DBS',
    collection_date: new Date().toISOString().slice(0, 16),
    reported_on: '',
    notes: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGenerateCode = async () => {
    setGenerating(true);
    try {
      const result = await generateSampleCode();
      setFormData(prev => ({ ...prev, sample_code: result.sample_code }));
    } catch (error: any) {
      console.error('Error generating sample code:', error);
      alert('Failed to generate sample code');
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.sample_code || !formData.patient_id || !formData.from_hospital) {
      alert('Please fill in all required fields (VRL Serial No, Sample ID, Hospital)');
      return;
    }

    setSubmitting(true);

    try {
      // Prepare data for API
      const apiData = {
        sample_code: formData.sample_code,
        patient_id: formData.patient_id,
        age_gender: formData.age_gender,
        from_hospital: formData.from_hospital,
        type_of_analysis: formData.type_of_analysis,
        type_of_sample: formData.type_of_sample,
        collection_date: formData.collection_date,
        reported_on: formData.reported_on || null,
        notes: formData.notes,
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
      alert(`Sample created successfully! VRL Serial No: ${result.sample_code}`);

      // Reset form
      setFormData({
        sample_code: '',
        patient_id: '',
        age_gender: '',
        from_hospital: '',
        type_of_analysis: '',
        type_of_sample: 'DBS',
        collection_date: new Date().toISOString().slice(0, 16),
        reported_on: '',
        notes: '',
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
        <div className="form-header">
          <h1>Sample Entry Form</h1>
          <p className="form-subtitle">Enter sample information based on laboratory records</p>
        </div>

        <form onSubmit={handleSubmit} className="sample-form">
          {/* Identification Section */}
          <div className="form-section">
            <h2 className="section-title">Sample Identification</h2>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="sample_code">VRL Serial No. *</label>
                <div className="input-with-button">
                  <input
                    type="text"
                    id="sample_code"
                    name="sample_code"
                    value={formData.sample_code}
                    onChange={handleChange}
                    placeholder="e.g., 6684"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleGenerateCode}
                    className="btn-generate"
                    disabled={generating}
                  >
                    {generating ? 'Generating...' : 'Generate'}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="patient_id">Sample ID (Patient Identifier) *</label>
                <input
                  type="text"
                  id="patient_id"
                  name="patient_id"
                  value={formData.patient_id}
                  onChange={handleChange}
                  placeholder="e.g., B/O najiya 378981"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="age_gender">Age / Gender</label>
                <input
                  type="text"
                  id="age_gender"
                  name="age_gender"
                  value={formData.age_gender}
                  onChange={handleChange}
                  placeholder="e.g., 10D/F, 3D/M 2.64"
                />
              </div>

              <div className="form-group">
                <label htmlFor="from_hospital">Hospital / Clinic *</label>
                <input
                  type="text"
                  id="from_hospital"
                  name="from_hospital"
                  value={formData.from_hospital}
                  onChange={handleChange}
                  placeholder="e.g., MEDICIS, LIKITHA"
                  required
                />
              </div>
            </div>
          </div>

          {/* Sample Details Section */}
          <div className="form-section">
            <h2 className="section-title">Sample Details</h2>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="type_of_analysis">Type of Analysis</label>
                <select
                  id="type_of_analysis"
                  name="type_of_analysis"
                  value={formData.type_of_analysis}
                  onChange={handleChange}
                >
                  <option value="">Select analysis type</option>
                  <option value="BIO6">BIO6</option>
                  <option value="BIO7">BIO7</option>
                  <option value="BIO8">BIO8</option>
                  <option value="BIO9">BIO9</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="type_of_sample">Type of Sample</label>
                <select
                  id="type_of_sample"
                  name="type_of_sample"
                  value={formData.type_of_sample}
                  onChange={handleChange}
                >
                  <option value="DBS">DBS (Dried Blood Spot)</option>
                  <option value="Serum">Serum</option>
                  <option value="Plasma">Plasma</option>
                  <option value="Whole Blood">Whole Blood</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="collection_date">Collection Date & Time</label>
                <input
                  type="datetime-local"
                  id="collection_date"
                  name="collection_date"
                  value={formData.collection_date}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="reported_on">Reported On</label>
                <input
                  type="datetime-local"
                  id="reported_on"
                  name="reported_on"
                  value={formData.reported_on}
                  onChange={handleChange}
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
