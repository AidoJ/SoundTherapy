import React, { useState, useEffect } from 'react';
import { getFrequencyMetadata } from '../services/audioMatcher';
import AudioPlayer from './AudioPlayer';
import './ResultsScreen.css';

const ResultsScreen = ({ frequency, onReset }) => {
  const [frequencyInfo, setFrequencyInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFrequencyData = async () => {
      setLoading(true);
      const data = await getFrequencyMetadata(frequency);
      setFrequencyInfo(data);
      setLoading(false);
    };

    loadFrequencyData();
  }, [frequency]);

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

      <div className="results-navigation">
        <button className="btn btn-secondary" onClick={onReset}>
          Start New Session
        </button>
      </div>
    </div>
  );
};

export default ResultsScreen;
