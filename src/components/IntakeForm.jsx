import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { contraindicationInfo } from '../utils/contraindicationInfo';
import './IntakeForm.css';

const IntakeForm = ({ onSubmit, bookingData, walkInMode = false }) => {
  const [loadingBooking, setLoadingBooking] = useState(false);
  const [bookingError, setBookingError] = useState(null);
  const [currentBookingId, setCurrentBookingId] = useState(null);
  const [bookingDuration, setBookingDuration] = useState(null);
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
    painMarkers: [],
    bodyView: 'front',

    // Safety Screen
    healthConcerns: [],

    // Session Duration (for walk-in mode)
    sessionDuration: null,

    // Consent
    consentGiven: false,
    therapistSignature: '',
    signatureDate: new Date().toISOString().split('T')[0]
  });

  const [showInfoModal, setShowInfoModal] = useState(false);
  const [modalInfo, setModalInfo] = useState(null);
  const [progress, setProgress] = useState(0);

  // Signature pad refs and state
  const therapistSignatureCanvasRef = useRef(null);
  const [isDrawingTherapist, setIsDrawingTherapist] = useState(false);

  // Update progress bar
  useEffect(() => {
    calculateProgress();
  }, [formData]);

  // Load booking data from URL parameter
  useEffect(() => {
    const loadBookingFromUrl = async () => {
      // Skip booking lookup for walk-in sessions
      if (walkInMode) {
        console.log('Walk-in mode: Skipping booking lookup');
        return;
      }

      // Check for bookingId in URL query parameter
      const urlParams = new URLSearchParams(window.location.search);
      const bookingId = urlParams.get('bookingId');

      if (bookingId) {
        try {
          setLoadingBooking(true);
          setBookingError(null);
          setCurrentBookingId(bookingId);

          // Fetch booking data with service duration
          const { data: booking, error: fetchError } = await supabase
            .from('bookings')
            .select(`
              *,
              services (
                duration_minutes
              )
            `)
            .eq('id', bookingId)
            .single();

          if (fetchError) throw fetchError;

          if (booking) {
            // Store booking duration
            setBookingDuration(booking.services?.duration_minutes || null);
            // Parse contraindications from JSON string
            let contraindications = [];
            try {
              contraindications = typeof booking.contraindications === 'string'
                ? JSON.parse(booking.contraindications)
                : booking.contraindications || [];
            } catch (e) {
              console.error('Error parsing contraindications:', e);
              contraindications = [];
            }

            // Auto-fill form from booking data
            setFormData(prev => ({
              ...prev,
              fullName: `${booking.firstname} ${booking.surname}`,
              phone: booking.phone,
              email: booking.email,
              healthConcerns: contraindications.length > 0 ? contraindications : ['none']
            }));

            // Mark booking as in-progress
            const { error: updateError } = await supabase
              .from('bookings')
              .update({
                bookingstatus: 'in-progress',
                startedat: new Date().toISOString()
              })
              .eq('id', bookingId);

            if (updateError) {
              console.error('Error updating booking status:', updateError);
            }
          }
        } catch (err) {
          console.error('Error loading booking:', err);
          setBookingError(err.message);
        } finally {
          setLoadingBooking(false);
        }
      }
    };

    loadBookingFromUrl();
  }, []);

  // Auto-populate from booking data prop (legacy support)
  useEffect(() => {
    if (bookingData) {
      setFormData(prev => ({
        ...prev,
        fullName: `${bookingData.firstName} ${bookingData.surname}`,
        phone: bookingData.phone,
        email: bookingData.email
      }));
    }
  }, [bookingData]);

  const calculateProgress = () => {
    const requiredFields = [
      formData.fullName,
      formData.email,
      formData.phone,
      formData.primaryGoals.length > 0,
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

  const handleBodyClick = (e) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Convert to SVG coordinates
    const svgX = (x / rect.width) * 360;
    const svgY = (y / rect.height) * 760;
    
    // Check if click is inside body silhouette (rough bounds)
    if (svgY > 40 && svgY < 750 && svgX > 60 && svgX < 300) {
      setFormData(prev => ({
        ...prev,
        painMarkers: [...prev.painMarkers, { x: Math.round(svgX), y: Math.round(svgY) }]
      }));
    }
  };

  // Therapist signature functions
  const startDrawingTherapist = (e) => {
    const canvas = therapistSignatureCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    setIsDrawingTherapist(true);
    ctx.beginPath();

    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.moveTo(x, y);
  };

  const drawTherapist = (e) => {
    if (!isDrawingTherapist) return;

    const canvas = therapistSignatureCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');

    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawingTherapist = () => {
    if (!isDrawingTherapist) return;
    setIsDrawingTherapist(false);
    
    // Save signature to form data
    const canvas = therapistSignatureCanvasRef.current;
    if (canvas) {
      const signatureData = canvas.toDataURL();
      setFormData(prev => ({
        ...prev,
        therapistSignature: signatureData
      }));
    }
  };

  const clearTherapistSignature = () => {
    const canvas = therapistSignatureCanvasRef.current;
    if (canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
      setFormData(prev => ({
        ...prev,
        therapistSignature: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (formData.primaryGoals.length === 0) {
      alert('Please select at least one primary goal');
      return;
    }

    // Safety Screen is now display-only (contraindications recorded at booking)
    // No validation needed here

    if (!formData.consentGiven) {
      alert('Please provide consent to continue');
      return;
    }

    if (!formData.therapistSignature) {
      alert('Please provide therapist signature');
      return;
    }

    // If this session came from a booking, mark it as completed
    if (currentBookingId) {
      try {
        const { error: updateError } = await supabase
          .from('bookings')
          .update({
            bookingstatus: 'completed',
            completedat: new Date().toISOString()
          })
          .eq('id', currentBookingId);

        if (updateError) {
          console.error('Error marking booking as completed:', updateError);
        }
      } catch (err) {
        console.error('Error updating booking:', err);
      }
    }

    // Include session duration in submitted data
    // Use formData.sessionDuration (from walk-in selector) if set, otherwise use bookingDuration (from database)
    const submittedData = {
      ...formData,
      sessionDuration: formData.sessionDuration || bookingDuration
    };

    onSubmit(submittedData);
  };

  return (
    <div className="intake-form-container">
      <div className="form-header">
        <h2>Vibroacoustic Session – Physical & Emotional Intake</h2>
        <p>Help us understand your needs for optimal therapy</p>
      </div>

      {loadingBooking && (
        <div className="info-banner">
          ⏳ Loading booking information...
        </div>
      )}

      {bookingError && (
        <div className="error-banner">
          ❌ Error loading booking: {bookingError}
        </div>
      )}

      {currentBookingId && !loadingBooking && (
        <div className="success-banner">
          ✅ Booking loaded successfully. Client details have been auto-filled.
        </div>
      )}

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

        {/* Session Duration (Walk-In Mode Only) */}
        {walkInMode && (
          <section className="form-card">
            <h3>⏱ Session Duration</h3>
            <p style={{fontSize: '14px', color: '#666', marginBottom: '16px'}}>
              Set the duration for this walk-in session, or leave blank for manual control.
            </p>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px'}}>
              {[
                { value: null, label: 'Manual Control' },
                { value: 15, label: '15 minutes' },
                { value: 20, label: '20 minutes' },
                { value: 30, label: '30 minutes' },
                { value: 45, label: '45 minutes' },
                { value: 60, label: '60 minutes' }
              ].map(option => (
                <label
                  key={option.value || 'manual'}
                  className="chip"
                  style={{
                    cursor: 'pointer',
                    backgroundColor: formData.sessionDuration === option.value ? '#007e8c' : '#f0f0f0',
                    color: formData.sessionDuration === option.value ? '#fff' : '#333',
                    border: formData.sessionDuration === option.value ? '2px solid #007e8c' : '2px solid #e0e0e0'
                  }}
                >
                  <input
                    type="radio"
                    name="sessionDuration"
                    value={option.value || ''}
                    checked={formData.sessionDuration === option.value}
                    onChange={() => setFormData({...formData, sessionDuration: option.value})}
                    style={{display: 'none'}}
                  />
                  <strong>{option.label}</strong>
                </label>
              ))}
            </div>
          </section>
        )}

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
            <div className="bodymap">
              <div className="svgbox">
                <div className="btns" style={{ gap: '6px', justifyContent: 'flex-end', padding: '8px 10px 0 10px' }}>
                  <button 
                    className="secondary" 
                    id="frontBtn" 
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, bodyView: 'front' }))}
                    style={{ 
                      background: formData.bodyView === 'front' ? '#008e8c' : '#e9f6f4',
                      color: formData.bodyView === 'front' ? '#fff' : '#0a6e6a'
                    }}
                  >
                    Front
                  </button>
                  <button 
                    className="secondary" 
                    id="backBtn" 
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, bodyView: 'back' }))}
                    style={{ 
                      background: formData.bodyView === 'back' ? '#008e8c' : '#e9f6f4',
                      color: formData.bodyView === 'back' ? '#fff' : '#0a6e6a'
                    }}
                  >
                    Back
                  </button>
                </div>
                <svg 
                  viewBox="0 0 360 760" 
                  id="bodySvg" 
                  xmlns="http://www.w3.org/2000/svg" 
                  aria-label="Tap to mark pain points" 
                  style={{ width: '100%', height: 'auto' }}
                  onClick={handleBodyClick}
                >
                  <defs>
                    <style>
                      {`.outline{fill:none;stroke:#99c9c6;stroke-width:2.25;stroke-linecap:round;stroke-linejoin:round}
                       .joint{fill:#d9efec;stroke:#bfe3df;stroke-width:1}`}
                    </style>
                  </defs>
                  <rect x="0" y="0" width="360" height="760" fill="#f7fbfa"/>

                  {/* FRONT silhouette */}
                  <g id="front" className="frontView" style={{ display: formData.bodyView === 'front' ? 'block' : 'none' }}>
                    <circle className="outline" cx="180" cy="90" r="40"/>
                    <path className="outline" d="M168 130 L192 130 L192 152 Q192 160 180 160 Q168 160 168 152 Z"/>
                    <path className="outline" d="M92 175 Q180 145 268 175"/>
                    <path className="outline" d="M120 180 Q110 230 120 290 Q128 360 180 360 Q232 360 240 290 Q250 230 240 180 Q212 168 180 168 Q148 168 120 180 Z"/>
                    <path className="outline" d="M140 360 Q180 380 220 360 Q230 370 230 388 Q230 408 180 416 Q130 408 130 388 Q130 370 140 360 Z"/>
                    <path className="outline" d="M100 185 Q78 210 72 245 Q64 300 78 340 Q90 372 112 392 Q126 404 132 422"/>
                    <path className="outline" d="M260 185 Q282 210 288 245 Q296 300 282 340 Q270 372 248 392 Q234 404 228 422"/>
                    <ellipse className="outline" cx="136" cy="440" rx="16" ry="10"/>
                    <ellipse className="outline" cx="224" cy="440" rx="16" ry="10"/>
                    <path className="outline" d="M158 418 Q155 468 154 528 Q152 600 152 648 Q152 700 168 720 Q180 734 192 720 Q208 700 208 648 Q208 600 206 528 Q205 468 202 418"/>
                    <circle className="joint" cx="154" cy="528" r="8"/>
                    <circle className="joint" cx="206" cy="528" r="8"/>
                    <path className="outline" d="M134 720 Q152 728 170 728 Q170 744 150 748 Q130 752 120 742 Q118 730 134 720 Z"/>
                    <path className="outline" d="M190 728 Q208 728 226 720 Q242 730 240 742 Q230 752 210 748 Q190 744 190 728 Z"/>
                  </g>

                  {/* BACK silhouette */}
                  <g id="back" className="backView" style={{ display: formData.bodyView === 'back' ? 'block' : 'none' }}>
                    <circle className="outline" cx="180" cy="90" r="40"/>
                    <path className="outline" d="M168 130 L192 130 L192 152 Q192 160 180 160 Q168 160 168 152 Z"/>
                    <path className="outline" d="M92 175 Q180 155 268 175"/>
                    <path className="outline" d="M120 182 Q110 230 118 290 Q126 352 180 360 Q234 352 242 290 Q250 230 240 182 Q212 170 180 170 Q148 170 120 182 Z"/>
                    <path className="outline" d="M138 360 Q180 382 222 360 Q230 372 230 392 Q230 412 180 420 Q130 412 130 392 Q130 372 138 360 Z"/>
                    <path className="outline" d="M104 186 Q86 214 82 250 Q76 300 92 340 Q106 374 128 398 Q138 410 142 430"/>
                    <path className="outline" d="M256 186 Q274 214 278 250 Q284 300 268 340 Q254 374 232 398 Q222 410 218 430"/>
                    <ellipse className="outline" cx="148" cy="448" rx="16" ry="10"/>
                    <ellipse className="outline" cx="212" cy="448" rx="16" ry="10"/>
                    <path className="outline" d="M160 420 Q158 470 156 532 Q154 600 154 650 Q154 700 170 720 Q180 734 190 720 Q206 700 206 650 Q206 600 204 532 Q202 470 200 420"/>
                    <circle className="joint" cx="156" cy="532" r="8"/>
                    <circle className="joint" cx="204" cy="532" r="8"/>
                    <path className="outline" d="M138 724 Q156 732 172 732 Q172 744 154 748 Q136 752 124 742 Q122 732 138 724 Z"/>
                    <path className="outline" d="M188 732 Q206 732 222 724 Q238 732 236 742 Q224 752 206 748 Q188 744 188 732 Z"/>
                  </g>

                  {/* Marker group */}
                  <g id="markers">
                    {formData.painMarkers.map((marker, index) => (
                      <circle
                        key={index}
                        cx={marker.x}
                        cy={marker.y}
                        r="6"
                        fill="#e11d48"
                        stroke="#fff"
                        strokeWidth="1.5"
                        style={{ cursor: 'pointer' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormData(prev => ({
                            ...prev,
                            painMarkers: prev.painMarkers.filter((_, i) => i !== index)
                          }));
                        }}
                      />
                    ))}
                  </g>
                </svg>
              </div>
              <div>
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
                <div className="btns" style={{ marginTop: '10px' }}>
                  <button 
                    className="secondary" 
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, painMarkers: [] }))}
                  >
                    Clear pain markers
                  </button>
                </div>
                <div className="muted" style={{ marginTop: '8px' }}>
                  {formData.painMarkers.length === 0 
                    ? 'No pain markers added.' 
                    : `Pain markers: ${formData.painMarkers.map((p, i) => `#${i+1} (x:${p.x}, y:${p.y})`).join(', ')}`
                  }
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Safety Screen */}
        <section className="form-card" style={walkInMode ? {position: 'relative'} : {opacity: 0.5, pointerEvents: 'none', position: 'relative'}}>
          {!walkInMode && (
            <div style={{position: 'absolute', top: '10px', right: '10px', background: '#e0e0e0', padding: '4px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: '600', color: '#666'}}>
              Information Only
            </div>
          )}
          <h3>4. Safety Screen</h3>
          <p style={{fontSize: '14px', color: '#666', marginBottom: '16px'}}>
            {walkInMode
              ? 'Please select any contraindications that apply to this client.'
              : 'This section is for reference. Contraindications are recorded at time of booking.'
            }
          </p>
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
                  disabled={!walkInMode}
                  onChange={(e) => {
                    if (walkInMode) {
                      const newConcerns = e.target.checked
                        ? [...formData.healthConcerns, concern.value]
                        : formData.healthConcerns.filter(c => c !== concern.value);
                      setFormData({...formData, healthConcerns: newConcerns});
                    }
                  }}
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
              <label htmlFor="therapistSignature">Client Signature *</label>
              <div className="signature-pad">
                <canvas
                  ref={therapistSignatureCanvasRef}
                  width="400"
                  height="100"
                  onMouseDown={startDrawingTherapist}
                  onMouseMove={drawTherapist}
                  onMouseUp={stopDrawingTherapist}
                  onMouseLeave={stopDrawingTherapist}
                  onTouchStart={startDrawingTherapist}
                  onTouchMove={drawTherapist}
                  onTouchEnd={stopDrawingTherapist}
                />
              </div>
              <button
                type="button"
                onClick={clearTherapistSignature}
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