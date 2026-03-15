import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateSampleCode, createSample, uploadSamplePdf, linkPdfToSample, deleteSamplePdf, getUnlinkedPdfs } from '../lib/sampleApi';
import type { SamplePdf } from '../lib/sampleApi';
import './SampleEntryForm.css';

interface SampleFormData {
  sample_code: string;         // VRL serial number
  patient_name: string;         // Patient Name
  sample_id: string;            // Sample ID
  date_of_birth: string;        // Date of Birth
  gender: string;               // Gender
  weight: string;               // Weight
  from_hospital: string;        // Client name
  type_of_analysis: string;     // e.g., "BIO7", "BIO6"
  type_of_sample: string;       // e.g., "DBS" (Dried Blood Spot)
  price: string;                // Price
  collection_date: string;      // Collection date
  registered_date: string;      // Registered date
  reported_on: string;          // Report date
  notes: string;
}

const STORAGE_KEY_CLIENTS = 'sample_client_list';
const STORAGE_KEY_ANALYSIS = 'sample_analysis_custom';
const STORAGE_KEY_SAMPLE_TYPE = 'sample_type_custom';
const STORAGE_KEY_HIDDEN_ANALYSIS = 'sample_analysis_hidden';
const STORAGE_KEY_HIDDEN_SAMPLE_TYPE = 'sample_type_hidden';

const DEFAULT_ANALYSIS_TYPES = ['BIO6', 'BIO7', 'BIO8'];
const DEFAULT_SAMPLE_TYPES = ['DBS', 'Serum', 'Plasma'];

function getLocalDateTimeString(date: Date = new Date()): string {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

// TODO: Populate this pricing matrix with actual client/analysis pricing data
// const PRICING_MATRIX: Record<string, Record<string, string>> = {
//   // 'ClientName': { 'AnalysisType': 'price' },
//   // e.g., 'MEDICIS': { 'BIO6': '1500', 'BIO7': '2000' },
// };

interface SampleEntryFormProps {
  embedded?: boolean;
  initialData?: { patient_name?: string } | null;
  onClose?: () => void;
  onSuccess?: () => void;
}

function computeAge(dob: string, referenceDate?: string): string {
  if (!dob) return '';
  const birthDate = new Date(dob);
  // Use collection date as reference if available, otherwise today
  const refDate = referenceDate ? new Date(referenceDate) : new Date();
  const diffMs = refDate.getTime() - birthDate.getTime();
  if (diffMs < 0) return '';

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 30) {
    return `${diffDays}D`;
  }

  const diffMonths =
    (refDate.getFullYear() - birthDate.getFullYear()) * 12 +
    (refDate.getMonth() - birthDate.getMonth());

  if (diffMonths < 12) {
    return `${diffMonths}M`;
  }

  const years = refDate.getFullYear() - birthDate.getFullYear();
  const hadBirthday =
    refDate.getMonth() > birthDate.getMonth() ||
    (refDate.getMonth() === birthDate.getMonth() && refDate.getDate() >= birthDate.getDate());
  return `${hadBirthday ? years : years - 1}Y`;
}

export default function SampleEntryForm({ embedded, initialData, onClose, onSuccess }: SampleEntryFormProps = {}) {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Computed age from DOB
  const [computedAge, setComputedAge] = useState('');

  // PDF upload state
  const [uploadedPdfs, setUploadedPdfs] = useState<SamplePdf[]>([]);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  // Existing PDFs (unlinked) for selection
  const [availablePdfs, setAvailablePdfs] = useState<SamplePdf[]>([]);
  const [selectedPdfIds, setSelectedPdfIds] = useState<number[]>([]);
  const [pdfSearch, setPdfSearch] = useState('');

  // Client combobox state
  const [clients, setClients] = useState<string[]>([]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  // Custom analysis/sample type values from localStorage
  const [customAnalysisTypes, setCustomAnalysisTypes] = useState<string[]>([]);
  const [customSampleTypes, setCustomSampleTypes] = useState<string[]>([]);
  const [hiddenAnalysisTypes, setHiddenAnalysisTypes] = useState<string[]>([]);
  const [hiddenSampleTypes, setHiddenSampleTypes] = useState<string[]>([]);
  const [showAnalysisDropdown, setShowAnalysisDropdown] = useState(false);
  const [showSampleTypeDropdown, setShowSampleTypeDropdown] = useState(false);

  const [formData, setFormData] = useState<SampleFormData>({
    sample_code: '',
    patient_name: initialData?.patient_name || '',
    sample_id: '',
    date_of_birth: '',
    gender: '',
    weight: '',
    from_hospital: '',
    type_of_analysis: '',
    type_of_sample: 'DBS',
    price: '',
    collection_date: getLocalDateTimeString(),
    registered_date: getLocalDateTimeString(),
    reported_on: '',
    notes: '',
  });

  // Load saved data and auto-generate serial number on mount
  useEffect(() => {
    const savedClients = localStorage.getItem(STORAGE_KEY_CLIENTS);
    const savedAnalysis = localStorage.getItem(STORAGE_KEY_ANALYSIS);
    const savedSampleType = localStorage.getItem(STORAGE_KEY_SAMPLE_TYPE);
    const savedHiddenAnalysis = localStorage.getItem(STORAGE_KEY_HIDDEN_ANALYSIS);
    const savedHiddenSampleType = localStorage.getItem(STORAGE_KEY_HIDDEN_SAMPLE_TYPE);

    if (savedClients) setClients(JSON.parse(savedClients));
    if (savedAnalysis) setCustomAnalysisTypes(JSON.parse(savedAnalysis));
    if (savedSampleType) setCustomSampleTypes(JSON.parse(savedSampleType));
    if (savedHiddenAnalysis) setHiddenAnalysisTypes(JSON.parse(savedHiddenAnalysis));
    if (savedHiddenSampleType) setHiddenSampleTypes(JSON.parse(savedHiddenSampleType));

    // Auto-fetch next serial number
    generateSampleCode()
      .then(result => {
        setFormData(prev => ({ ...prev, sample_code: result.sample_code }));
      })
      .catch(() => {
        // Silently fail — user can type manually or click Generate
      });

    // Fetch available unlinked PDFs
    getUnlinkedPdfs()
      .then(pdfs => setAvailablePdfs(pdfs))
      .catch(() => {});
  }, []);

  // Recompute age when DOB or collection date changes
  useEffect(() => {
    setComputedAge(computeAge(formData.date_of_birth, formData.collection_date));
  }, [formData.date_of_birth, formData.collection_date]);

  // TODO: Auto-fill price based on client + analysis type when PRICING_MATRIX is populated
  // useEffect(() => {
  //   if (formData.from_hospital && formData.type_of_analysis) {
  //     const clientPrices = PRICING_MATRIX[formData.from_hospital];
  //     if (clientPrices && clientPrices[formData.type_of_analysis]) {
  //       setFormData(prev => ({ ...prev, price: clientPrices[formData.type_of_analysis] }));
  //     }
  //   }
  // }, [formData.from_hospital, formData.type_of_analysis]);

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

  // PDF upload handler
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingPdf(true);
    for (let i = 0; i < files.length; i++) {
      try {
        const result = await uploadSamplePdf(files[i]);
        setUploadedPdfs(prev => [...prev, result]);
      } catch (error: any) {
        console.error('Error uploading PDF:', error);
        alert(`Failed to upload ${files[i].name}`);
      }
    }
    setUploadingPdf(false);
    // Reset the input so the same file can be selected again
    e.target.value = '';
  };

  const handleRemovePdf = async (pdfId: number) => {
    try {
      await deleteSamplePdf(pdfId);
      setUploadedPdfs(prev => prev.filter(p => p.id !== pdfId));
    } catch (error: any) {
      console.error('Error removing PDF:', error);
    }
  };

  // Client combobox handlers
  const saveClientValue = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !clients.includes(trimmed)) {
      const updated = [...clients, trimmed];
      setClients(updated);
      localStorage.setItem(STORAGE_KEY_CLIENTS, JSON.stringify(updated));
    }
  };

  const removeClient = (value: string) => {
    const updated = clients.filter(c => c !== value);
    setClients(updated);
    localStorage.setItem(STORAGE_KEY_CLIENTS, JSON.stringify(updated));
    if (formData.from_hospital === value) {
      setFormData(prev => ({ ...prev, from_hospital: '' }));
    }
  };

  const allAnalysisTypes = [
    ...DEFAULT_ANALYSIS_TYPES.filter(d => !hiddenAnalysisTypes.includes(d)),
    ...customAnalysisTypes.filter(c => !DEFAULT_ANALYSIS_TYPES.includes(c)),
  ];
  const allSampleTypes = [
    ...DEFAULT_SAMPLE_TYPES.filter(d => !hiddenSampleTypes.includes(d)),
    ...customSampleTypes.filter(c => !DEFAULT_SAMPLE_TYPES.includes(c)),
  ];

  // Save typed value to dropdown options on blur
  const saveAnalysisValue = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !allAnalysisTypes.includes(trimmed)) {
      const updated = [...customAnalysisTypes, trimmed];
      setCustomAnalysisTypes(updated);
      localStorage.setItem(STORAGE_KEY_ANALYSIS, JSON.stringify(updated));
    }
  };

  const saveSampleTypeValue = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !allSampleTypes.includes(trimmed)) {
      const updated = [...customSampleTypes, trimmed];
      setCustomSampleTypes(updated);
      localStorage.setItem(STORAGE_KEY_SAMPLE_TYPE, JSON.stringify(updated));
    }
  };

  const removeAnalysisType = (value: string) => {
    if (DEFAULT_ANALYSIS_TYPES.includes(value)) {
      const updated = [...hiddenAnalysisTypes, value];
      setHiddenAnalysisTypes(updated);
      localStorage.setItem(STORAGE_KEY_HIDDEN_ANALYSIS, JSON.stringify(updated));
    } else {
      const updated = customAnalysisTypes.filter(t => t !== value);
      setCustomAnalysisTypes(updated);
      localStorage.setItem(STORAGE_KEY_ANALYSIS, JSON.stringify(updated));
    }
    if (formData.type_of_analysis === value) {
      setFormData(prev => ({ ...prev, type_of_analysis: '' }));
    }
  };

  const removeSampleType = (value: string) => {
    if (DEFAULT_SAMPLE_TYPES.includes(value)) {
      const updated = [...hiddenSampleTypes, value];
      setHiddenSampleTypes(updated);
      localStorage.setItem(STORAGE_KEY_HIDDEN_SAMPLE_TYPE, JSON.stringify(updated));
    } else {
      const updated = customSampleTypes.filter(t => t !== value);
      setCustomSampleTypes(updated);
      localStorage.setItem(STORAGE_KEY_SAMPLE_TYPE, JSON.stringify(updated));
    }
    if (formData.type_of_sample === value) {
      setFormData(prev => ({ ...prev, type_of_sample: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.sample_code || !formData.patient_name || !formData.from_hospital || !formData.type_of_analysis || !formData.type_of_sample || !formData.sample_id) {
      alert('Please fill in all required fields (VRLS Serial No, Patient Name, Client Name, Sample ID, Type of Analysis, Type of Sample)');
      return;
    }

    setSubmitting(true);

    try {
      // Prepare data for API - combine age/gender and weight into age_gender field
      const ageGenderWeight = [
        computedAge || '',
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
        registered_date: formData.registered_date || undefined,
        reported_on: formData.reported_on || undefined,
        notes: formData.notes,
        sample_metadata: {
          price: formData.price,
          sample_id: formData.sample_id,
          date_of_birth: formData.date_of_birth,
        }
      };

      const result = await createSample(apiData);

      // Link uploaded PDFs
      for (const pdf of uploadedPdfs) {
        try {
          await linkPdfToSample(result.id, pdf.id);
        } catch {
          console.error(`Failed to link PDF ${pdf.filename}, but sample was created`);
        }
      }

      // Link selected existing PDFs
      for (const pdfId of selectedPdfIds) {
        try {
          await linkPdfToSample(result.id, pdfId);
        } catch {
          console.error(`Failed to link existing PDF ${pdfId}, but sample was created`);
        }
      }

      alert(`Sample created successfully! VRLS Serial No: ${result.sample_code}`);

      // Reset form
      setUploadedPdfs([]);
      setSelectedPdfIds([]);
      setPdfSearch('');
      setFormData({
        sample_code: '',
        patient_name: '',
        sample_id: '',
        date_of_birth: '',
        gender: '',
        weight: '',
        from_hospital: '',
        type_of_analysis: '',
        type_of_sample: 'DBS',
        price: '',
        collection_date: getLocalDateTimeString(),
        registered_date: getLocalDateTimeString(),
        reported_on: '',
        notes: '',
      });
      setComputedAge('');

      if (embedded) {
        onSuccess?.();
        onClose?.();
      } else {
        navigate('/sample-entry/tracking');
      }
    } catch (error: any) {
      console.error('Error creating sample:', error);
      const message = error.response?.data?.detail || error.message || 'Failed to create sample';
      alert(message);
    } finally {
      setSubmitting(false);
    }
  };

  const formContent = (
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
                <label htmlFor="sample_code">VRLS Serial No. *</label>
                <div className="input-with-button">
                  <input
                    type="text"
                    id="sample_code"
                    name="sample_code"
                    value={formData.sample_code}
                    onChange={handleChange}
                    placeholder="e.g., VRLS-2026-001"
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

              <div className="form-group custom-dropdown-group">
                <label htmlFor="from_hospital">Client Name *</label>
                <input
                  type="text"
                  id="from_hospital"
                  name="from_hospital"
                  value={formData.from_hospital}
                  onChange={(e) => { setFormData(prev => ({ ...prev, from_hospital: e.target.value })); setShowClientDropdown(true); }}
                  onFocus={() => setShowClientDropdown(true)}
                  onBlur={() => { setTimeout(() => setShowClientDropdown(false), 200); saveClientValue(formData.from_hospital); }}
                  placeholder="Type or select..."
                  required
                  autoComplete="off"
                />
                {showClientDropdown && clients.length > 0 && (
                  <div className="custom-dropdown">
                    {clients
                      .filter(c => !formData.from_hospital || c.toLowerCase().includes(formData.from_hospital.toLowerCase()))
                      .map(c => (
                      <div key={c} className="custom-dropdown-item"
                        onClick={() => { setFormData(prev => ({ ...prev, from_hospital: c })); setShowClientDropdown(false); }}
                      >
                        <span className={formData.from_hospital === c ? 'selected' : ''}>
                          {c}
                        </span>
                        <button
                          type="button"
                          className="remove-option"
                          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); removeClient(c); }}
                          title="Remove this option"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="sample_id">Sample ID *</label>
                <input
                  type="text"
                  id="sample_id"
                  name="sample_id"
                  value={formData.sample_id}
                  onChange={handleChange}
                  placeholder="e.g., 378981"
                  required
                />
              </div>
            </div>

            {/* DOB, Age, Gender, Weight on same row */}
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="date_of_birth">Date of Birth</label>
                <div className="input-with-button">
                  <input
                    type="date"
                    id="date_of_birth"
                    name="date_of_birth"
                    value={formData.date_of_birth}
                    onChange={handleChange}
                    max={new Date().toISOString().slice(0, 10)}
                  />
                  {computedAge && (
                    <span className="computed-age">Age: {computedAge}</span>
                  )}
                </div>
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
                  inputMode="decimal"
                />
              </div>
            </div>
          </div>

          {/* Sample Details Section */}
          <div className="form-section">
            <h2 className="section-title">Sample Details</h2>
            <div className="form-grid">
              <div className="form-group custom-dropdown-group">
                <label htmlFor="type_of_analysis">Type of Analysis *</label>
                <input
                  type="text"
                  id="type_of_analysis"
                  name="type_of_analysis"
                  value={formData.type_of_analysis}
                  onChange={(e) => { setFormData(prev => ({ ...prev, type_of_analysis: e.target.value })); setShowAnalysisDropdown(true); }}
                  onFocus={() => setShowAnalysisDropdown(true)}
                  onBlur={() => { setTimeout(() => setShowAnalysisDropdown(false), 200); saveAnalysisValue(formData.type_of_analysis); }}
                  placeholder="Type or select..."
                  required
                  autoComplete="off"
                />
                {showAnalysisDropdown && allAnalysisTypes.length > 0 && (
                  <div className="custom-dropdown">
                    {allAnalysisTypes
                      .filter(t => !formData.type_of_analysis || t.toLowerCase().includes(formData.type_of_analysis.toLowerCase()))
                      .map(t => (
                      <div key={t} className="custom-dropdown-item"
                        onClick={() => { setFormData(prev => ({ ...prev, type_of_analysis: t })); setShowAnalysisDropdown(false); }}
                      >
                        <span className={formData.type_of_analysis === t ? 'selected' : ''}>
                          {t}
                        </span>
                        <button
                          type="button"
                          className="remove-option"
                          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); removeAnalysisType(t); }}
                          title="Remove this option"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group custom-dropdown-group">
                <label htmlFor="type_of_sample">Type of Sample *</label>
                <input
                  type="text"
                  id="type_of_sample"
                  name="type_of_sample"
                  value={formData.type_of_sample}
                  onChange={(e) => { setFormData(prev => ({ ...prev, type_of_sample: e.target.value })); setShowSampleTypeDropdown(true); }}
                  onFocus={() => setShowSampleTypeDropdown(true)}
                  onBlur={() => { setTimeout(() => setShowSampleTypeDropdown(false), 200); saveSampleTypeValue(formData.type_of_sample); }}
                  placeholder="Type or select..."
                  required
                  autoComplete="off"
                />
                {showSampleTypeDropdown && allSampleTypes.length > 0 && (
                  <div className="custom-dropdown">
                    {allSampleTypes
                      .filter(t => !formData.type_of_sample || t.toLowerCase().includes(formData.type_of_sample.toLowerCase()))
                      .map(t => (
                      <div key={t} className="custom-dropdown-item"
                        onClick={() => { setFormData(prev => ({ ...prev, type_of_sample: t })); setShowSampleTypeDropdown(false); }}
                      >
                        <span className={formData.type_of_sample === t ? 'selected' : ''}>
                          {t}
                        </span>
                        <button
                          type="button"
                          className="remove-option"
                          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); removeSampleType(t); }}
                          title="Remove this option"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="price">Price (₹)</label>
                <input
                  type="text"
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="e.g., 1500, 2000"
                  inputMode="decimal"
                />
              </div>

              <div className="form-group">
                <label htmlFor="collection_date">Collection Date & Time (IST)</label>
                <input
                  type="datetime-local"
                  id="collection_date"
                  name="collection_date"
                  value={formData.collection_date}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="registered_date">Registered Date & Time (IST)</label>
                <input
                  type="datetime-local"
                  id="registered_date"
                  name="registered_date"
                  value={formData.registered_date}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="reported_on">Reported On (IST)</label>
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

          {/* Report Attachment Section */}
          <div className="form-section">
            <h2 className="section-title">Attach Report (PDF)</h2>

            {/* Upload a PDF */}
            <div className="pdf-upload-subsection">
              <h3 className="subsection-title">Upload a PDF</h3>
              <div className="pdf-upload-area">
                <label className="pdf-upload-label">
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    multiple
                    onChange={handlePdfUpload}
                    disabled={uploadingPdf}
                    className="pdf-upload-input"
                  />
                  <span className="pdf-upload-button">
                    {uploadingPdf ? 'Uploading...' : 'Choose PDF files'}
                  </span>
                  <span className="pdf-upload-hint">or drag and drop PDF files here</span>
                </label>
              </div>
              {uploadedPdfs.length > 0 && (
                <div className="uploaded-pdfs-list">
                  {uploadedPdfs.map(pdf => (
                    <div key={pdf.id} className="uploaded-pdf-chip">
                      <span className="uploaded-pdf-name">{pdf.filename}</span>
                      <span className="uploaded-pdf-size">
                        {pdf.file_size < 1024 * 1024
                          ? `${(pdf.file_size / 1024).toFixed(1)} KB`
                          : `${(pdf.file_size / (1024 * 1024)).toFixed(1)} MB`}
                      </span>
                      <button
                        type="button"
                        className="uploaded-pdf-remove"
                        onClick={() => handleRemovePdf(pdf.id)}
                        title="Remove this PDF"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Browse existing PDFs */}
            <div className="pdf-upload-subsection">
              <h3 className="subsection-title">
                Browse existing PDFs
                {selectedPdfIds.length > 0 && (
                  <button
                    type="button"
                    className="btn-clear-selection"
                    onClick={() => setSelectedPdfIds([])}
                    style={{ marginLeft: '0.75rem', fontSize: '0.75rem' }}
                  >
                    Clear ({selectedPdfIds.length})
                  </button>
                )}
              </h3>
              {availablePdfs.length === 0 ? (
                <p className="attachment-message">No unlinked PDFs available in the system.</p>
              ) : (
                <>
                  <input
                    type="text"
                    value={pdfSearch}
                    onChange={(e) => setPdfSearch(e.target.value)}
                    placeholder="Search by filename..."
                    className="pdf-search-input"
                  />
                  <div className="existing-pdfs-list">
                    {availablePdfs
                      .filter(pdf => {
                        const q = pdfSearch.toLowerCase();
                        return !q || pdf.filename.toLowerCase().replace(/_/g, ' ').includes(q);
                      })
                      .sort((a, b) => {
                        // Auto-match: PDFs matching patient name float to top
                        const name = formData.patient_name.toLowerCase().trim();
                        if (!name) return 0;
                        const norm = (s: string) => s.toLowerCase().replace(/_/g, ' ');
                        const extractName = (s: string) => norm(s).replace(/nbs report /i, '').replace(/\.pdf$/, '').trim();
                        const aMatch = norm(a.filename).includes(name) || name.includes(extractName(a.filename));
                        const bMatch = norm(b.filename).includes(name) || name.includes(extractName(b.filename));
                        if (aMatch && !bMatch) return -1;
                        if (!aMatch && bMatch) return 1;
                        return 0;
                      })
                      .map(pdf => {
                        const isSelected = selectedPdfIds.includes(pdf.id);
                        const patientName = formData.patient_name.toLowerCase().trim();
                        const pdfNorm = pdf.filename.toLowerCase().replace(/_/g, ' ');
                        const pdfPatient = pdfNorm.replace(/nbs report /i, '').replace(/\.pdf$/, '').trim();
                        const isMatch = patientName.length > 0 && (pdfNorm.includes(patientName) || patientName.includes(pdfPatient));
                        return (
                          <div
                            key={pdf.id}
                            className={`existing-pdf-item ${isSelected ? 'selected' : ''} ${isMatch ? 'matched' : ''}`}
                            onClick={() => {
                              setSelectedPdfIds(prev =>
                                isSelected ? prev.filter(id => id !== pdf.id) : [...prev, pdf.id]
                              );
                            }}
                          >
                            <input type="checkbox" checked={isSelected} readOnly />
                            <div className="existing-pdf-info">
                              <span className="existing-pdf-name">{pdf.filename}</span>
                              <span className="existing-pdf-meta">
                                {pdf.file_size < 1024 * 1024
                                  ? `${(pdf.file_size / 1024).toFixed(1)} KB`
                                  : `${(pdf.file_size / (1024 * 1024)).toFixed(1)} MB`}
                                {' · '}{new Date(pdf.uploaded_at).toLocaleDateString()}
                                {isMatch && <span className="match-badge">Name match</span>}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </>
              )}
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
              onClick={() => embedded ? onClose?.() : navigate(-1)}
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
  );

  if (embedded) return formContent;
  return <div className="sample-entry-form-page">{formContent}</div>;
}
