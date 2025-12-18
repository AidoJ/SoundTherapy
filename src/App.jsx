import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import WelcomeScreen from './components/WelcomeScreen';
import BookingForm from './components/BookingForm';
import BookingSuccess from './components/BookingSuccess';
import BookingsList from './components/BookingsList';
import IntakeForm from './components/IntakeForm';
import ResultsScreen from './components/ResultsScreen';
import { matchAudioFile, getAudioFileForFrequency } from './services/audioMatcher';
import { saveClient, saveSession, getClientByEmail } from './services/supabaseClient';
// Email sending is now handled in ResultsScreen when Complete Session is clicked
import './App.css';

// Main App component
function App() {
  const [recommendedFrequency, setRecommendedFrequency] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [bookingData, setBookingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleStart = () => {
    navigate('/booking');
  };

  const handleBookingComplete = (booking) => {
    setBookingData(booking);
    navigate('/booking-success');
  };

  const handleFormSubmit = async (formData) => {
    setLoading(true);

    try {
      // Store form data for later use in email
      setSessionData(formData);

      // 1. Use intelligent audio matcher to select best frequency
      const frequency = await matchAudioFile(formData);
      setRecommendedFrequency(frequency);

      // Get the audio file from database
      const audioFile = await getAudioFileForFrequency(frequency);
      console.log('Selected audio file:', audioFile);

      // 2. Save to Supabase
      // First, check if client exists or create new
      const clientData = {
        firstName: formData.fullName.split(' ')[0] || '',
        surname: formData.fullName.split(' ').slice(1).join(' ') || '',
        email: formData.email,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth || null,
        gender: null
      };

      // Check if client exists
      let clientId;
      const existingClient = await getClientByEmail(clientData.email);

      if (existingClient.success && existingClient.data) {
        // Client exists, use existing ID
        clientId = existingClient.data.id;
        console.log('Existing client found:', clientId);
      } else {
        // Client doesn't exist, create new
        const clientResult = await saveClient(clientData);
        if (clientResult.success) {
          clientId = clientResult.data.id;
          console.log('New client created:', clientId);
        } else {
          console.error('Error saving client:', clientResult.error);
          // For now, continue without saving
        }
      }

      // 3. Save session data
      if (clientId) {
        const sessionDataForDb = {
          client_id: clientId,
          session_date: formData.todaysDate,
          session_time: new Date().toLocaleTimeString(),
          intention: formData.primaryGoals.join(', '),
          goal_description: formData.primaryGoals.join(', '),
          physical_energy: formData.painLevel,
          emotional_balance: formData.stressAnxietyLevel,
          mental_clarity: formData.sleepQuality,
          spiritual_connection: 5, // Default to 5 (midpoint) - field not collected in new form
          selected_frequencies: [],
          health_concerns: formData.healthConcerns,
          medications: '',
          vibration_intensity: 'moderate', // Must be 'gentle', 'moderate', or 'deep' per database constraint
          emotional_indicators: [],
          intuitive_messages: '',
          consent_given: formData.consentGiven,
          signature: formData.therapistSignature,
          signature_date: formData.signatureDate,
          frequency_suggested: frequency,
          status: 'scheduled'
        };

        const sessionResult = await saveSession(sessionDataForDb);

        if (sessionResult.success) {
          console.log('Session saved successfully:', sessionResult.data);

          // 4. Emails will be sent when Complete Session button is clicked
        } else {
          console.error('Error saving session:', sessionResult.error);
        }
      }

      // 5. Show results
      navigate('/results');
    } catch (error) {
      console.error('Error processing form:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    navigate('/');
    setRecommendedFrequency(null);
    setSessionData(null);
    setBookingData(null);
  };

  return (
    <div className="app">
      <div className="container">
        {loading && <div className="loading-overlay">Processing...</div>}

        <Routes>
          {/* Home / Welcome Screen */}
          <Route path="/" element={<WelcomeScreen onStart={handleStart} />} />

          {/* Market Booking Form */}
          <Route
            path="/booking"
            element={<BookingForm onBookingComplete={handleBookingComplete} />}
          />

          {/* Booking Success Page */}
          <Route path="/booking-success" element={<BookingSuccess />} />

          {/* Practitioner Bookings Dashboard */}
          <Route path="/bookings" element={<BookingsList />} />

          {/* Intake Form (accepts ?bookingId parameter) */}
          <Route
            path="/intake"
            element={<IntakeForm onSubmit={handleFormSubmit} bookingData={bookingData} />}
          />

          {/* Walk-In Session (no booking required) */}
          <Route
            path="/walk-in"
            element={<IntakeForm onSubmit={handleFormSubmit} walkInMode={true} />}
          />

          {/* Results Screen */}
          <Route
            path="/results"
            element={
              recommendedFrequency && sessionData ? (
                <ResultsScreen
                  frequency={recommendedFrequency}
                  sessionData={sessionData}
                  onReset={handleReset}
                />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
