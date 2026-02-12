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
      console.log('📋 Step 1: Running audio matcher...');
      const frequency = await matchAudioFile(formData);
      console.log('📋 Step 1 done: frequency =', frequency);
      setRecommendedFrequency(frequency);

      // Get the audio file from database
      console.log('📋 Step 2: Getting audio file for frequency...');
      const audioFile = await getAudioFileForFrequency(frequency);
      console.log('📋 Step 2 done: audioFile =', audioFile?.file_name || 'null');

      // 2. Save to Supabase
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
      console.log('📋 Step 3: Looking up client by email...');
      const existingClient = await getClientByEmail(clientData.email);
      console.log('📋 Step 3 done: existingClient =', existingClient.success, existingClient.data?.id);

      if (existingClient.success && existingClient.data) {
        clientId = existingClient.data.id;
      } else {
        console.log('📋 Step 3b: Creating new client...');
        const clientResult = await saveClient(clientData);
        console.log('📋 Step 3b done:', clientResult.success);
        if (clientResult.success) {
          clientId = clientResult.data.id;
        } else {
          console.error('Error saving client:', clientResult.error);
        }
      }

      // 3. Save session data
      if (clientId) {
        console.log('📋 Step 4: Saving session...');
        const sessionDataForDb = {
          client_id: clientId,
          session_date: formData.todaysDate,
          session_time: new Date().toLocaleTimeString(),
          intention: formData.primaryGoals.join(', '),
          goal_description: formData.primaryGoals.join(', '),
          physical_energy: formData.painLevel,
          emotional_balance: formData.stressAnxietyLevel,
          mental_clarity: formData.sleepQuality,
          spiritual_connection: 5,
          selected_frequencies: [],
          health_concerns: formData.healthConcerns,
          medications: '',
          vibration_intensity: 'moderate',
          emotional_indicators: [],
          intuitive_messages: '',
          consent_given: formData.consentGiven,
          signature: formData.therapistSignature,
          signature_date: formData.signatureDate,
          frequency_suggested: frequency,
          status: 'scheduled'
        };

        const sessionResult = await saveSession(sessionDataForDb);
        console.log('📋 Step 4 done:', sessionResult.success);

        if (!sessionResult.success) {
          console.error('Error saving session:', sessionResult.error);
        }
      }

      // 5. Show results
      console.log('📋 Step 5: Navigating to results...');
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
