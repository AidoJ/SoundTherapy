import React, { useState, useEffect, useRef } from 'react';
import { getFrequencyMetadata } from '../services/audioMatcher';
import { sendVibroFollowupEmails } from '../services/emailService';
import AudioPlayer from './AudioPlayer';
import './ResultsScreen.css';

const ResultsScreen = ({ frequency, sessionData, onReset }) => {
  const [frequencyInfo, setFrequencyInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);

  // Therapist section state
  const therapistSignatureCanvasRef = useRef(null);
  const [isDrawingTherapist, setIsDrawingTherapist] = useState(false);
  const [therapistSignatureEmpty, setTherapistSignatureEmpty] = useState(true);
  const [therapistNotes, setTherapistNotes] = useState('');

  useEffect(() => {
    const loadFrequencyData = async () => {
      setLoading(true);
      const data = await getFrequencyMetadata(frequency);
      setFrequencyInfo(data);
      setLoading(false);
    };

    loadFrequencyData();
  }, [frequency]);

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
    setTherapistSignatureEmpty(false);
  };

  const stopDrawingTherapist = () => {
    setIsDrawingTherapist(false);
  };

  const clearTherapistSignature = () => {
    const canvas = therapistSignatureCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setTherapistSignatureEmpty(true);
  };

  const handleCompleteSession = async () => {
    const canvas = therapistSignatureCanvasRef.current;
    const therapistSignatureDataUrl = therapistSignatureEmpty ? '' : canvas.toDataURL();

    setSendingEmail(true);

    try {
      // Send Vibro_Followup emails to both client and practitioner
      const emailResult = await sendVibroFollowupEmails(
        sessionData,
        frequencyInfo,
        therapistNotes
      );

      if (emailResult.success) {
        const clientSuccess = emailResult.results?.client?.success;
        const practitionerSuccess = emailResult.results?.practitioner?.success;
        
        if (clientSuccess && practitionerSuccess) {
          alert('Session completed! Vibro_Followup emails sent to both client and practitioner.');
        } else if (clientSuccess) {
          alert('Session completed! Vibro_Followup email sent to client. Practitioner email failed.');
        } else if (practitionerSuccess) {
          alert('Session completed! Vibro_Followup email sent to practitioner. Client email failed.');
        } else {
          alert('Session completed! However, emails could not be sent. Please check EmailJS configuration.');
        }
      } else {
        alert('Session completed! However, the emails could not be sent. Please check EmailJS configuration.');
      }

      // TODO: Save therapist notes and signature to database
      console.log('Therapist Notes:', therapistNotes);
      console.log('Therapist Signature:', therapistSignatureDataUrl);

      onReset();
    } catch (error) {
      console.error('Error completing session:', error);
      alert('An error occurred while completing the session. Please try again.');
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="results-screen">
        <div className="loading">Loading frequency information...</div>
      </div>
    );
  }

  return (
    <div className="results-screen">
      <div className="results-hero">
        <h2>Your Personalized Healing Frequency</h2>
        <p className="results-subtitle">
          Based on your intake responses, we've selected the optimal frequency for your session
        </p>
      </div>

      <div className="frequency-card">
        <h2 className="frequency-hz">{frequencyInfo.hz} Hz</h2>
        <h3 className="frequency-name">{frequencyInfo.name}</h3>
        <p className="frequency-description">
          {frequencyInfo.healingProperties && frequencyInfo.healingProperties.length > 0
            ? `Healing Properties: ${frequencyInfo.healingProperties.join(', ')}`
            : 'A healing frequency selected for your session'}
        </p>
        {frequencyInfo.primaryIntentions && frequencyInfo.primaryIntentions.length > 0 && (
          <p className="frequency-intentions">
            <strong>Primary Intentions:</strong> {frequencyInfo.primaryIntentions.join(', ')}
          </p>
        )}
        {frequencyInfo.family && (
          <p className="frequency-family">
            <strong>Family:</strong> {frequencyInfo.family}
          </p>
        )}
      </div>

      <AudioPlayer frequency={frequency} />

      {/* Therapist Section */}
      <div className="therapist-section" style={{
        background: '#f0f8ff',
        borderLeft: '4px solid #007e8c',
        padding: '30px',
        borderRadius: '12px',
        marginTop: '30px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
      }}>
        <h3 style={{ color: '#007e8c', marginBottom: '8px' }}>Therapist Notes & Signature</h3>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
          Complete this section after the session ends
        </p>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
            Session Notes
          </label>
          <textarea
            value={therapistNotes}
            onChange={(e) => setTherapistNotes(e.target.value)}
            placeholder="Document observations, client responses, adjustments made, and recommendations for future sessions..."
            rows={6}
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #ddd',
              borderRadius: '8px',
              fontSize: '16px',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
            Therapist Signature
          </label>
          <div style={{ border: '2px solid #ddd', borderRadius: '8px', background: 'white' }}>
            <canvas
              ref={therapistSignatureCanvasRef}
              width={400}
              height={150}
              style={{ display: 'block', cursor: 'crosshair', touchAction: 'none' }}
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
      </div>

      <div className="results-navigation">
        <button
          className="btn"
          onClick={handleCompleteSession}
          disabled={sendingEmail}
          style={{
            width: '100%',
            fontSize: '18px',
            padding: '16px',
            opacity: sendingEmail ? 0.7 : 1,
            cursor: sendingEmail ? 'not-allowed' : 'pointer'
          }}
        >
          {sendingEmail ? 'Sending Email...' : 'Complete Session →'}
        </button>
      </div>
    </div>
  );
};

export default ResultsScreen;
