import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateSampleCode } from '../lib/sampleApi';
import './SampleEntryForm.css';

interface SampleFormData {
  sample_code: string;         // VRL serial number
  patient_name: string;         // Patient Name
  sample_id: string;            // Sample ID
  age: string;                  // Age
  gender: string;               // Gender
  weight: string;               // Weight
  from_hospital: string;        // Client name
  type_of_analysis: string;     // e.g., "BIO7", "BIO6"
  type_of_sample: string;       // e.g., "DBS" (Dried Blood Spot)
  collection_date: string;      // Collection date
  reported_on: string;          // Report date
  notes: string;
}

const STORAGE_KEY_ANALYSIS = 'sample_analysis_history';
const STORAGE_KEY_SAMPLE_TYPE = 'sample_type_history';

export default function SampleEntryForm() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Autocomplete suggestions
  const [analysisSuggestions, setAnalysisSuggestions] = useState<string[]>([]);
  const [sampleTypeSuggestions, setSampleTypeSuggestions] = useState<string[]>([]);
  const [showAnalysisSuggestions, setShowAnalysisSuggestions] = useState(false);
  const [showSampleTypeSuggestions, setShowSampleTypeSuggestions] = useState(false);

  const [formData, setFormData] = useState<SampleFormData>({
    sample_code: '',
    patient_name: '',
    sample_id: '',
    age: '',
    gender: '',
    weight: '',
    from_hospital: '',
    type_of_analysis: '',
    type_of_sample: 'DBS',
    collection_date: new Date().toISOString().slice(0, 16),
    reported_on: '',
    notes: '',
  });

  // Load saved suggestions on mount
  useEffect(() => {
    const savedAnalysis = localStorage.getItem(STORAGE_KEY_ANALYSIS);
    const savedSampleType = localStorage.getItem(STORAGE_KEY_SAMPLE_TYPE);

    if (savedAnalysis) {
      setAnalysisSuggestions(JSON.parse(savedAnalysis));
    }
    if (savedSampleType) {
      setSampleTypeSuggestions(JSON.parse(savedSampleType));
    }
  }, []);

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

  const addToSuggestions = (key: string, value: string, suggestions: string[], setSuggestions: (val: string[]) => void) => {
    if (value && !suggestions.includes(value)) {
      const updated = [...suggestions, value];
      setSuggestions(updated);
      localStorage.setItem(key, JSON.stringify(updated));
    }
  };

  const removeSuggestion = (key: string, value: string, suggestions: string[], setSuggestions: (val: string[]) => void) => {
    const updated = suggestions.filter(s => s !== value);
    setSuggestions(updated);
    localStorage.setItem(key, JSON.stringify(updated));
  };

  const handleAnalysisChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, type_of_analysis: value }));
    setShowAnalysisSuggestions(value.length > 0);
  };

  const handleSampleTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, type_of_sample: value }));
    setShowSampleTypeSuggestions(value.length > 0);
  };

  const selectAnalysisSuggestion = (value: string) => {
    setFormData(prev => ({ ...prev, type_of_analysis: value }));
    setShowAnalysisSuggestions(false);
  };

  const selectSampleTypeSuggestion = (value: string) => {
    setFormData(prev => ({ ...prev, type_of_sample: value }));
    setShowSampleTypeSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.sample_code || !formData.patient_name || !formData.from_hospital) {
      alert('Please fill in all required fields (VRL Serial No, Patient Name, Client Name)');
      return;
    }

    setSubmitting(true);

    try {
      // Save successful inputs to suggestions
      if (formData.type_of_analysis) {
        addToSuggestions(STORAGE_KEY_ANALYSIS, formData.type_of_analysis, analysisSuggestions, setAnalysisSuggestions);
      }
      if (formData.type_of_sample) {
        addToSuggestions(STORAGE_KEY_SAMPLE_TYPE, formData.type_of_sample, sampleTypeSuggestions, setSampleTypeSuggestions);
      }

      // Prepare data for API - combine age/gender and weight into age_gender field
      const ageGenderWeight = [
        formData.age,
        formData.gender,
        formData.weight ? `${formData.weight}kg` : ''
      ].filter(Boolean).join('/');

      const apiData = {
        sample_code: formData.sample_code,
        patient_id: formData.patient_name,
        age_gender: ageGenderWeight,
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
        patient_name: '',
        sample_id: '',
        age: '',
        gender: '',
        weight: '',
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

  const filteredAnalysisSuggestions = analysisSuggestions.filter(s =>
    s.toLowerCase().includes(formData.type_of_analysis.toLowerCase())
  );

  const filteredSampleTypeSuggestions = sampleTypeSuggestions.filter(s =>
    s.toLowerCase().includes(formData.type_of_sample.toLowerCase())
  );

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
                <label htmlFor="patient_name">Patient Name *</label>
                <input
                  type="text"
                  id="patient_name"
                  name="patient_name"
                  value={formData.patient_name}
                  onChange={handleChange}
                  placeholder="e.g., Najiya, Baby of Kalyani"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="sample_id">Sample ID</label>
                <input
                  type="text"
                  id="sample_id"
                  name="sample_id"
                  value={formData.sample_id}
                  onChange={handleChange}
                  placeholder="e.g., 378981"
                />
              </div>

              <div className="form-group">
                <label htmlFor="age">Age</label>
                <input
                  type="text"
                  id="age"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  placeholder="e.g., 10D, 3M, 2Y"
                />
              </div>

              <div className="form-group">
                <label htmlFor="gender">Gender</label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                >
                  <option value="">Select gender</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="O">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="weight">Weight (kg)</label>
                <input
                  type="text"
                  id="weight"
                  name="weight"
                  value={formData.weight}
                  onChange={handleChange}
                  placeholder="e.g., 2.64, 3.2"
                />
              </div>

              <div className="form-group">
                <label htmlFor="from_hospital">Client Name *</label>
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
              <div className="form-group autocomplete-group">
                <label htmlFor="type_of_analysis">Type of Analysis</label>
                <input
                  type="text"
                  id="type_of_analysis"
                  name="type_of_analysis"
                  value={formData.type_of_analysis}
                  onChange={handleAnalysisChange}
                  onFocus={() => setShowAnalysisSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowAnalysisSuggestions(false), 200)}
                  placeholder="e.g., BIO6, BIO7, BIO8"
                />
                {showAnalysisSuggestions && filteredAnalysisSuggestions.length > 0 && (
                  <div className="suggestions-dropdown">
                    {filteredAnalysisSuggestions.map((suggestion, index) => (
                      <div key={index} className="suggestion-item">
                        <span onClick={() => selectAnalysisSuggestion(suggestion)}>
                          {suggestion}
                        </span>
                        <button
                          type="button"
                          className="remove-suggestion"
                          onClick={() => removeSuggestion(STORAGE_KEY_ANALYSIS, suggestion, analysisSuggestions, setAnalysisSuggestions)}
                          title="Remove from suggestions"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group autocomplete-group">
                <label htmlFor="type_of_sample">Type of Sample</label>
                <input
                  type="text"
                  id="type_of_sample"
                  name="type_of_sample"
                  value={formData.type_of_sample}
                  onChange={handleSampleTypeChange}
                  onFocus={() => setShowSampleTypeSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSampleTypeSuggestions(false), 200)}
                  placeholder="e.g., DBS, Serum, Plasma"
                />
                {showSampleTypeSuggestions && filteredSampleTypeSuggestions.length > 0 && (
                  <div className="suggestions-dropdown">
                    {filteredSampleTypeSuggestions.map((suggestion, index) => (
                      <div key={index} className="suggestion-item">
                        <span onClick={() => selectSampleTypeSuggestion(suggestion)}>
                          {suggestion}
                        </span>
                        <button
                          type="button"
                          className="remove-suggestion"
                          onClick={() => removeSuggestion(STORAGE_KEY_SAMPLE_TYPE, suggestion, sampleTypeSuggestions, setSampleTypeSuggestions)}
                          title="Remove from suggestions"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
