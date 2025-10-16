import React, { useState, useEffect } from 'react';
import { contraindicationInfo } from '../utils/contraindicationInfo';
import './IntakeForm.css';

const IntakeForm = ({ onSubmit }) => {
  const [formData, setFormData] = useState({
    // Client Details
    fullName: '',
    dateOfBirth: '',
    phone: '',
    email: '',
    todaysDate: new Date().toISOString().split('T')[0],
    practitioner: '',

    // Primary Goals
    primaryGoals: [],

    // Symptom Snapshot
    painLevel: 0,
    stressAnxietyLevel: 0,
    sleepQuality: 1,
    mainPainAreas: [],

    // Safety Screen
    healthConcerns: [],

    // Consent
    consentGiven: false,
    therapistSignature: '',
    signatureDate: new Date().toISOString().split('T')[0]
  });

  const [showInfoModal, setShowInfoModal] = useState(false);
  const [modalInfo, setModalInfo] = useState(null);
  const [progress, setProgress] = useState(0);

  // Update progress bar
  useEffect(() => {
    calculateProgress();
  }, [formData]);

  const calculateProgress = () => {
    const requiredFields = [
      formData.fullName,
      formData.email,
      formData.phone,
      formData.primaryGoals.length > 0,
      formData.healthConcerns.length > 0,
      formData.consentGiven,
      formData.therapistSignature
    ];

    const filled = requiredFields.filter(Boolean).length;
    const percent = (filled / requiredFields.length) * 100;
    setProgress(percent);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleCheckboxGroup = (name, value) => {
    setFormData(prev => {
      const current = prev[name] || [];
      const updated = current.includes(value)
        ? current.filter(item => item !== value)
        : [...current, value];
      return { ...prev, [name]: updated };
    });
  };

  const handleSliderChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: parseInt(value)
    }));
  };

  const showContraindicationInfo = (e, key) => {
    e.preventDefault();
    e.stopPropagation();
    setModalInfo(contraindicationInfo[key]);
    setShowInfoModal(true);
  };

  const closeModal = () => {
    setShowInfoModal(false);
    setModalInfo(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    if (formData.primaryGoals.length === 0) {
      alert('Please select at least one primary goal');
      return;
    }

    // Health concerns validation - now required
    if (formData.healthConcerns.length === 0) {
      alert('Please complete the Safety Screen section');
      return;
    }

    // Contraindication check
    const hasContraindications = formData.healthConcerns.some(concern => concern !== 'none');
    if (hasContraindications) {
      const confirmed = window.confirm(
        'Unfortunately you have checked an existing condition that has a contra-indication, we can not proceed with this treatment unless you have a consent form from your GP or attending Physician. Understood?'
      );
      if (!confirmed) {
        return;
      }
    }

    if (!formData.consentGiven) {
      alert('Please provide consent to continue');
      return;
    }

    if (!formData.therapistSignature.trim()) {
      alert('Please provide therapist signature');
      return;
    }

    onSubmit(formData);
  };

  return (
    <div className="intake-form-container">
      <div className="form-header">
        <h2>Vibroacoustic Session – Physical & Emotional Intake</h2>
        <p>Help us understand your needs for optimal therapy</p>
      </div>

      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }}></div>
      </div>

      <form onSubmit={handleSubmit} className="intake-form">
        
        {/* Client Details */}
        <section className="form-card">
          <h3>1. Client Details</h3>
          <div className="form-grid cols-2">
            <div className="form-group">
              <label htmlFor="fullName">Full Name *</label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="dateOfBirth">Date of Birth</label>
              <input
                type="date"
                id="dateOfBirth"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleInputChange}
              />
            </div>
          </div>
          <div className="form-grid cols-2">
            <div className="form-group">
              <label htmlFor="phone">Phone *</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>
          <div className="form-grid cols-2">
            <div className="form-group">
              <label htmlFor="todaysDate">Today's Date</label>
              <input
                type="date"
                id="todaysDate"
                name="todaysDate"
                value={formData.todaysDate}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <label htmlFor="practitioner">Practitioner</label>
              <input
                type="text"
                id="practitioner"
                name="practitioner"
                value={formData.practitioner}
                onChange={handleInputChange}
              />
            </div>
          </div>
        </section>

        {/* Primary Goals */}
        <section className="form-card">
          <h3>2. Primary Goals</h3>
          <div className="chips">
            {[
              'Reduce pain/discomfort (specify area)',
              'Lower stress/anxiety / calm the nervous system',
              'Improve sleep quality / ease insomnia',
              'Ease fibromyalgia symptoms',
              'Support movement ease',
              'Improve mental clarity/focus',
              'General relaxation / recovery'
            ].map(goal => (
              <label key={goal} className="chip">
                <input
                  type="checkbox"
                  checked={formData.primaryGoals.includes(goal)}
                  onChange={() => handleCheckboxGroup('primaryGoals', goal)}
                />
                <strong>{goal}</strong>
              </label>
            ))}
          </div>
        </section>

        {/* Symptom Snapshot */}
        <section className="form-card">
          <h3>3. Symptom Snapshot (past 7 days)</h3>
          <div className="energy-grid">
            <div className="energy-row">
              <label>Pain Level</label>
              <div className="energy-slider">
                <span className="muted">0</span>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={formData.painLevel}
                  onChange={(e) => handleSliderChange('painLevel', e.target.value)}
                />
                <span className="muted">10</span>
                <span className="energy-value">{formData.painLevel}</span>
              </div>
            </div>
            <div className="energy-row">
              <label>Stress/Anxiety Level</label>
              <div className="energy-slider">
                <span className="muted">0</span>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={formData.stressAnxietyLevel}
                  onChange={(e) => handleSliderChange('stressAnxietyLevel', e.target.value)}
                />
                <span className="muted">10</span>
                <span className="energy-value">{formData.stressAnxietyLevel}</span>
              </div>
            </div>
            <div className="energy-row">
              <label>Sleep Quality</label>
              <div className="energy-slider">
                <span className="muted">1</span>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={formData.sleepQuality}
                  onChange={(e) => handleSliderChange('sleepQuality', e.target.value)}
                />
                <span className="muted">5</span>
                <span className="energy-value">{formData.sleepQuality}</span>
              </div>
            </div>
          </div>
          <div style={{ marginTop: '24px' }}>
            <label>Main Pain Areas</label>
            <div className="chips">
              {[
                'Neck',
                'Shoulders',
                'Lower back',
                'Hips',
                'Knees',
                'Headaches/Migraines',
                'Widespread (fibromyalgia)'
              ].map(area => (
                <label key={area} className="chip">
                  <input
                    type="checkbox"
                    checked={formData.mainPainAreas.includes(area)}
                    onChange={() => handleCheckboxGroup('mainPainAreas', area)}
                  />
                  <strong>{area}</strong>
                </label>
              ))}
            </div>
          </div>
        </section>

        {/* Safety Screen */}
        <section className="form-card">
          <h3>4. Safety Screen <span style={{color: 'red'}}>*</span></h3>
          <div className="chips">
            {[
              { value: 'pacemaker', label: 'Pacemakers/Implants' },
              { value: 'dvt', label: 'Deep Vein Thrombosis' },
              { value: 'bleeding', label: 'Bleeding Disorders' },
              { value: 'surgery', label: 'Recent Surgery/Open Wounds' },
              { value: 'hypotension', label: 'Severe Low Blood Pressure' },
              { value: 'epilepsy', label: 'Seizure Disorders' },
              { value: 'inflammatory', label: 'Acute Inflammatory Conditions' },
              { value: 'psychotic', label: 'Psychotic Conditions' },
              { value: 'pregnancy', label: 'Pregnancy' },
              { value: 'chemotherapy', label: 'Chemotherapy / Active Cancer Treatment' },
              { value: 'none', label: 'None apply' }
            ].map(concern => (
              <label key={concern.value} className="chip health-chip">
                <input
                  type="checkbox"
                  checked={formData.healthConcerns.includes(concern.value)}
                  onChange={() => handleCheckboxGroup('healthConcerns', concern.value)}
                />
                <strong>{concern.label}</strong>
                {concern.value !== 'none' && (
                  <span className="info-icon" onClick={(e) => showContraindicationInfo(e, concern.value)}>
                    ?
                  </span>
                )}
              </label>
            ))}
          </div>
        </section>

        {/* Consent & Acknowledgement */}
        <section className="form-card">
          <h3>5. Consent & Acknowledgement</h3>
          <div className="consent-notice">
            <p>I understand that Vibroacoustic Therapy involves low-frequency sound and vibration to promote relaxation and balance. I acknowledge that:</p>
            <ul style={{ marginLeft: '20px', lineHeight: '1.8', marginTop: '12px' }}>
              <li>The session is complementary and non-medical, not intended to diagnose, treat, or cure disease.</li>
              <li>The practitioner is not a doctor or psychotherapist and makes no guarantees of outcome.</li>
              <li>I have disclosed all relevant health information for safe use of the bed.</li>
              <li>I will inform the practitioner of any discomfort or distress.</li>
              <li>I accept full responsibility for my participation and responses.</li>
              <li>All information shared is confidential except where disclosure is required by law.</li>
              <li>I release the practitioner and facility from liability arising from participation.</li>
              <li>I confirm I am of sound mind and legal age to give consent.</li>
            </ul>
          </div>
          <div className="consent-check">
            <input
              type="checkbox"
              id="consent"
              name="consentGiven"
              checked={formData.consentGiven}
              onChange={handleInputChange}
              required
            />
            <label htmlFor="consent" className="consent-label">
              I have read and agree to the above terms and conditions.
            </label>
          </div>
          <div className="form-grid cols-2" style={{ marginTop: '16px' }}>
            <div className="form-group">
              <label htmlFor="therapistSignature">Therapist Signature *</label>
              <input
                type="text"
                id="therapistSignature"
                name="therapistSignature"
                value={formData.therapistSignature}
                onChange={handleInputChange}
                placeholder="Therapist name or signature"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="signatureDate">Date of Signature</label>
              <input
                type="date"
                id="signatureDate"
                name="signatureDate"
                value={formData.signatureDate}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>
        </section>

        <div className="form-navigation">
          <button type="submit" className="btn btn-primary">
            Submit Intake Form
          </button>
        </div>
      </form>

      {/* Info Modal */}
      {showInfoModal && modalInfo && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modalInfo.title}</h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">
              <p>{modalInfo.text}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntakeForm;