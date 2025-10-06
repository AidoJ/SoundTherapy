import React from 'react';
import './WelcomeScreen.css';

const WelcomeScreen = ({ onStart }) => {
  return (
    <div className="welcome-screen">
      <div className="welcome-hero">
        <div className="lotus-container">
          <svg className="lotus" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M32 6c6 8 9 14 9 18 0 6-4 10-9 10s-9-4-9-10c0-4 3-10 9-18z" fill="url(#g1)"/>
            <path d="M10 26c9 2 14 5 16 9 2 4 1 9-3 12-4 3-10 2-14-3-3-4-3-12 1-18z" fill="url(#g2)"/>
            <path d="M54 26c-9 2-14 5-16 9-2 4-1 9 3 12 4 3 10 2 14-3 3-4 3-12-1-18z" fill="url(#g3)"/>
            <defs>
              <linearGradient id="g1" x1="32" y1="6" x2="32" y2="34" gradientUnits="userSpaceOnUse">
                <stop stopColor="#c4b0e0"/>
                <stop offset="1" stopColor="#007e8c"/>
              </linearGradient>
              <linearGradient id="g2" x1="10" y1="26" x2="28" y2="48">
                <stop stopColor="#9b7fc4"/>
                <stop offset="1" stopColor="#00a3b5"/>
              </linearGradient>
              <linearGradient id="g3" x1="36" y1="26" x2="54" y2="48">
                <stop stopColor="#9b7fc4"/>
                <stop offset="1" stopColor="#00a3b5"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <h1>Sound Healing Therapy</h1>
        <p className="subtitle">Vibroacoustic Bed Healing Experience</p>
      </div>

      <div className="welcome-content">
        <h2>Welcome to Your Healing Journey</h2>
        <p>
          Experience the transformative power of vibroacoustic therapy using ancient Solfeggio frequencies.
          Through low-frequency sound and gentle vibration, we help you find balance, release tension,
          and restore harmony to your body, mind, and spirit.
        </p>
        <p>
          Our personalized approach analyzes your unique needs to select the optimal healing frequency
          for your session today. Each frequency has been carefully chosen for its therapeutic properties
          and ability to promote deep relaxation and energetic alignment.
        </p>
        <p>
          This complementary therapy is non-medical and designed to support your overall wellness journey.
          Let the healing vibrations guide you to a place of profound peace and restoration.
        </p>
      </div>

      <div className="btn-container">
        <button className="btn" onClick={onStart}>
          Begin Your Healing Session
        </button>
      </div>
    </div>
  );
};

export default WelcomeScreen;
