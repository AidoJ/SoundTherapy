import React, { useState } from 'react';
import WelcomeScreen from './components/WelcomeScreen';
import IntakeForm from './components/IntakeForm';
import ResultsScreen from './components/ResultsScreen';
import { analyzeFrequency } from './utils/frequencyAnalyzer';
import { saveClient, saveSession } from './services/supabaseClient';
import { sendClientConfirmation, sendPractitionerNotification } from './services/emailService';
import './App.css';

function App() {
  const [screen, setScreen] = useState('welcome'); // 'welcome', 'form', 'results'
  const [recommendedFrequency, setRecommendedFrequency] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleStart = () => {
    setScreen('form');
  };

  const handleFormSubmit = async (formData) => {
    setLoading(true);

    try {
      // 1. Analyze frequency based on form data
      const frequency = analyzeFrequency(formData);
      setRecommendedFrequency(frequency);

      // 2. Save to Supabase
      // First, check if client exists or create new
      const clientData = {
        firstName: formData.firstName,
        surname: formData.surname,
        email: formData.email,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth || null,
        gender: formData.gender || null
      };

      // Save or get client
      const clientResult = await saveClient(clientData);
      let clientId;

      if (clientResult.success) {
        clientId = clientResult.data.id;
      } else {
        console.error('Error saving client:', clientResult.error);
        // For now, continue without saving
      }

      // 3. Save session data
      if (clientId) {
        const sessionData = {
          client_id: clientId,
          session_date: formData.date,
          session_time: formData.time,
          intention: formData.intention,
          goal_description: formData.goalDescription,
          physical_energy: formData.physicalEnergy,
          emotional_balance: formData.emotionalBalance,
          mental_clarity: formData.mentalClarity,
          spiritual_connection: formData.spiritualConnection,
          selected_frequencies: formData.selectedFrequencies,
          health_concerns: formData.healthConcerns,
          medications: formData.medications,
          vibration_intensity: formData.vibrationIntensity,
          emotional_indicators: formData.emotionalIndicators,
          intuitive_messages: formData.intuitiveMessages,
          consent_given: formData.consentGiven,
          signature: formData.signature,
          signature_date: formData.signatureDate,
          frequency_suggested: frequency,
          status: 'scheduled'
        };

        const sessionResult = await saveSession(sessionData);

        if (sessionResult.success) {
          console.log('Session saved successfully:', sessionResult.data);

          // 4. Send emails (optional - will skip if EmailJS not configured)
          try {
            await sendClientConfirmation(clientData, {
              sessionDate: formData.date,
              sessionTime: formData.time
            }, frequency);

            await sendPractitionerNotification(clientData, {
              ...sessionData,
              frequencySuggested: frequency
            });
          } catch (emailError) {
            console.log('Email sending skipped or failed:', emailError);
          }
        } else {
          console.error('Error saving session:', sessionResult.error);
        }
      }

      // 5. Show results
      setScreen('results');
    } catch (error) {
      console.error('Error processing form:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setScreen('welcome');
    setRecommendedFrequency(null);
  };

  return (
    <div className="app">
      <div className="container">
        {screen === 'welcome' && <WelcomeScreen onStart={handleStart} />}

        {screen === 'form' && (
          <>
            {loading && <div className="loading-overlay">Processing...</div>}
            <IntakeForm onSubmit={handleFormSubmit} />
          </>
        )}

        {screen === 'results' && recommendedFrequency && (
          <ResultsScreen frequency={recommendedFrequency} onReset={handleReset} />
        )}
      </div>
    </div>
  );
}

export default App;
