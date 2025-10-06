import React from 'react';
import { getFrequencyData } from '../utils/frequencyData';
import AudioPlayer from './AudioPlayer';
import './ResultsScreen.css';

const ResultsScreen = ({ frequency, onReset }) => {
  const frequencyInfo = getFrequencyData(frequency);

  return (
    <div className="results-screen">
      <div className="results-hero">
        <h2>Your Personalized Healing Frequency</h2>
        <p className="results-subtitle">
          Based on your intake responses, we've selected the optimal frequency for your session
        </p>
      </div>

      <div className="frequency-card">
        <h2 className="frequency-hz">{frequency} Hz</h2>
        <h3 className="frequency-name">{frequencyInfo.name}</h3>
        <p className="frequency-description">{frequencyInfo.description}</p>
      </div>

      <AudioPlayer frequency={frequency} />

      <div className="results-navigation">
        <button className="btn btn-secondary" onClick={onReset}>
          Start New Session
        </button>
      </div>
    </div>
  );
};

export default ResultsScreen;
