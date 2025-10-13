import React, { useState, useEffect, useRef } from 'react';
import { contraindicationInfo } from '../utils/contraindicationInfo';
import './IntakeForm.css';

const IntakeForm = ({ onSubmit }) => {
  const signatureCanvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureEmpty, setSignatureEmpty] = useState(true);

  const [formData, setFormData] = useState({
    // Basic Info
    date: new Date().toISOString().split('T')[0],
    time: '',
    firstName: '',
    surname: '',
    phone: '',
    email: '',
    dateOfBirth: '',
    gender: '',

    // Session Intention
    intention: [],
    goalDescription: '',

    // Energy Profile
    physicalEnergy: 5,
    emotionalBalance: 5,
    mentalClarity: 5,
    spiritualConnection: 5,
    selectedFrequencies: [],

    // Health Check
    healthConcerns: [],
    medications: '',
    vibrationIntensity: 'moderate',

    // Emotional Indicators
    emotionalIndicators: [],
    intuitiveMessages: '',

    // Consent
    consentGiven: false,
    signature: '',
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
      formData.firstName,
      formData.surname,
      formData.email,
      formData.phone,
      formData.intention.length > 0,
      formData.selectedFrequencies.length > 0,
      formData.consentGiven,
      formData.signature
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

  const handleFrequencySelection = (value) => {
    setFormData(prev => {
      const current = prev.selectedFrequencies || [];

      if (current.includes(value)) {
        return {
          ...prev,
          selectedFrequencies: current.filter(item => item !== value)
        };
      }

      if (current.length >= 3) {
        alert('Please select only 3 priorities');
        return prev;
      }

      return {
        ...prev,
        selectedFrequencies: [...current, value]
      };
    });
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

  // Signature pad functions
  const startDrawing = (e) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    setIsDrawing(true);
    ctx.beginPath();

    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;

    const canvas = signatureCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');

    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    setSignatureEmpty(false);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureEmpty(true);
    setFormData(prev => ({ ...prev, signature: '' }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    if (formData.selectedFrequencies.length === 0) {
      alert('Please select at least one priority frequency');
      return;
    }

    if (!formData.consentGiven) {
      alert('Please provide consent to continue');
      return;
    }

    if (signatureEmpty) {
      alert('Please provide your signature');
      return;
    }

    // Convert signature canvas to base64
    const canvas = signatureCanvasRef.current;
    const signatureDataUrl = canvas.toDataURL();

    onSubmit({ ...formData, signature: signatureDataUrl });
  };

  return (
    <div className="intake-form-container">
      <div className="form-header">
        <h2>Client Intake Form</h2>
        <p>Help us determine your optimal Solfeggio frequency profile</p>
      </div>

      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }}></div>
      </div>

      <form onSubmit={handleSubmit} className="intake-form">
        {/* Basic Info */}
        <section className="form-card">
          <div className="form-grid cols-2">
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Time</label>
              <input
                type="time"
                name="time"
                value={formData.time}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label>First Name</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                placeholder="First name"
                required
              />
            </div>
            <div className="form-group">
              <label>Surname</label>
              <input
                type="text"
                name="surname"
                value={formData.surname}
                onChange={handleInputChange}
                placeholder="Last name"
                required
              />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="Your contact number"
                required
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="your@email.com"
                required
              />
            </div>
            <div className="form-group">
              <label>Date of Birth</label>
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <label>Gender</label>
              <select name="gender" value={formData.gender} onChange={handleInputChange}>
                <option value="">Prefer not to say</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </section>

        {/* Session Intention */}
        <section className="form-card">
          <h3>1. Session Intention</h3>
          <p className="form-help">Select the primary focus (you may choose more than one)</p>
          <div className="chips">
            {['stress', 'anxiety', 'pain', 'sleep', 'emotional', 'spiritual', 'clarity', 'energy'].map(intent => (
              <label key={intent} className="chip">
                <input
                  type="checkbox"
                  checked={formData.intention.includes(intent)}
                  onChange={() => handleCheckboxGroup('intention', intent)}
                />
                {intent.charAt(0).toUpperCase() + intent.slice(1)} {intent === 'anxiety' && '/ Overthinking'} {intent === 'pain' && '/ Tension'} {intent === 'sleep' && '/ Fatigue'}
              </label>
            ))}
          </div>
          <div className="form-group" style={{ marginTop: '16px' }}>
            <label>Briefly describe your goal or what you'd like to shift:</label>
            <textarea
              name="goalDescription"
              value={formData.goalDescription}
              onChange={handleInputChange}
              placeholder="What brings you here today?"
            />
          </div>
        </section>

        {/* Energy Profile */}
        <section className="form-card">
          <h3>2. Energy & Frequency Profile</h3>
          <p className="form-help">How do you feel today? (Scale 1-10)</p>
          <div className="energy-grid">
            {[
              { key: 'physicalEnergy', label: 'Physical Energy' },
              { key: 'emotionalBalance', label: 'Emotional Balance' },
              { key: 'mentalClarity', label: 'Mental Clarity' },
              { key: 'spiritualConnection', label: 'Spiritual Connection' }
            ].map(({ key, label }) => (
              <div key={key} className="energy-row">
                <label>{label}</label>
                <div className="energy-slider">
                  <span className="muted">Low</span>
                  <input
                    type="range"
                    name={key}
                    min="1"
                    max="10"
                    value={formData[key]}
                    onChange={handleInputChange}
                  />
                  <span className="muted">High</span>
                  <output className="energy-value">{formData[key]}</output>
                </div>
              </div>
            ))}
          </div>

          <p className="frequency-instruction">
            From the checkboxes below select the three that you believe are a priority for you
            (Don't over-think this - just click the first three that attracts your attention)
          </p>
          <div className="frequency-grid">
            {[
              { value: '174', label: 'Safety • Pain relief • Grounding' },
              { value: '285', label: 'Repair • Regeneration • Recovery' },
              { value: '396', label: 'Release fear • Root stability' },
              { value: '417', label: 'Transmute past • Change' },
              { value: '528', label: 'Love • DNA harmony • Vitality' },
              { value: '639', label: 'Heart harmony • Relationships' },
              { value: '741', label: 'Detox • Clarity • Truth' },
              { value: '852', label: 'Intuition • Spiritual clarity' },
              { value: '963', label: 'Oneness • Crown awakening' }
            ].map(freq => (
              <label key={freq.value} className="frequency-option">
                <input
                  type="checkbox"
                  checked={formData.selectedFrequencies.includes(freq.value)}
                  onChange={() => handleFrequencySelection(freq.value)}
                />
                <strong>{freq.label}</strong>
              </label>
            ))}
          </div>
        </section>

        {/* Health Check */}
        <section className="form-card">
          <h3>3. Health & Comfort Check</h3>
          <p className="form-help">Please check any that apply:</p>
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
          <div className="form-grid cols-2" style={{ marginTop: '16px' }}>
            <div className="form-group">
              <label>Current medications / conditions</label>
              <textarea
                name="medications"
                value={formData.medications}
                onChange={handleInputChange}
                placeholder="Brief list"
              />
            </div>
            <div className="form-group">
              <label>Preferred vibration intensity</label>
              <select
                name="vibrationIntensity"
                value={formData.vibrationIntensity}
                onChange={handleInputChange}
              >
                <option value="gentle">Gentle</option>
                <option value="moderate">Moderate</option>
                <option value="deep">Deep</option>
              </select>
            </div>
          </div>
        </section>

        {/* Emotional Indicators */}
        <section className="form-card">
          <h3>4. Emotional / Spiritual Indicators</h3>
          <p className="form-help">Circle any that feel active:</p>
          <div className="chips">
            {[
              { value: 'fear', label: 'Fear / Guilt' },
              { value: 'grief', label: 'Grief / Heartache' },
              { value: 'confusion', label: 'Confusion' },
              { value: 'doubt', label: 'Self-Doubt' },
              { value: 'loneliness', label: 'Loneliness' },
              { value: 'disconnection', label: 'Disconnection' },
              { value: 'depression', label: 'Depression' }
            ].map(emotion => (
              <label key={emotion.value} className="chip">
                <input
                  type="checkbox"
                  checked={formData.emotionalIndicators.includes(emotion.value)}
                  onChange={() => handleCheckboxGroup('emotionalIndicators', emotion.value)}
                />
                {emotion.label}
              </label>
            ))}
          </div>
          <div className="form-group" style={{ marginTop: '16px' }}>
            <label>Any intuitive messages, dreams, or intentions to honour today?</label>
            <textarea
              name="intuitiveMessages"
              value={formData.intuitiveMessages}
              onChange={handleInputChange}
              placeholder="Optional"
            />
          </div>
        </section>

        {/* Consent */}
        <section className="form-card">
          <h3>5. Consent & Acknowledgement</h3>
          <div className="consent-notice">
            <p>I understand that Vibroacoustic Therapy involves the use of low-frequency sound and gentle vibration to promote relaxation and balance. I acknowledge and agree that:</p>
            <ul style={{ marginLeft: '20px', lineHeight: '1.8', marginTop: '12px' }}>
              <li>The session is complementary and non-medical, not intended to diagnose, treat, cure, or prevent disease.</li>
              <li>The practitioner is not a medical doctor or psychotherapist and makes no guarantees of outcome.</li>
              <li>I have disclosed all relevant health information to ensure safe use of the Vibroacoustic Bed.</li>
              <li>I will inform the practitioner immediately of any discomfort, dizziness, or emotional distress.</li>
              <li>I accept full responsibility for my participation and any responses—physical, mental, or emotional—that may occur.</li>
              <li>All shared information is confidential, except where disclosure is required by law.</li>
              <li>I release the practitioner and facility from any liability arising from participation, except where prohibited by law.</li>
              <li>I confirm I am of sound mind and legal age to give informed consent.</li>
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
              <label>Client Signature</label>
              <div style={{ border: '2px solid #ddd', borderRadius: '8px', background: 'white' }}>
                <canvas
                  ref={signatureCanvasRef}
                  width={400}
                  height={150}
                  style={{ display: 'block', cursor: 'crosshair', touchAction: 'none' }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
              <button
                type="button"
                onClick={clearSignature}
                style={{
                  marginTop: '8px',
                  padding: '6px 12px',
                  background: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Clear Signature
              </button>
            </div>
            <div className="form-group">
              <label>Signature Date</label>
              <input
                type="date"
                name="signatureDate"
                value={formData.signatureDate}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>
        </section>

        <div className="form-navigation">
          <button type="button" className="btn btn-secondary" onClick={() => window.location.reload()}>
            ← Start Over
          </button>
          <button type="submit" className="btn">
            Start Session →
          </button>
        </div>
      </form>

      {/* Info Modal */}
      {showInfoModal && modalInfo && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h4>{modalInfo.title}</h4>
            <p>{modalInfo.text}</p>
            <button className="btn" onClick={closeModal}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntakeForm;
