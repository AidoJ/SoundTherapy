import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { getAudioFileForFrequency } from '../services/audioMatcher';
import endSessionAudio from '../assets/EndSession.m4a';
import './AudioPlayer.css';

const AudioPlayer = ({ frequency, sessionDuration, onSessionEnd }) => {
  const audioRef = useRef(null);
  const endAudioRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(70);
  const [audioFile, setAudioFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState(null);
  const [sessionEnded, setSessionEnded] = useState(false);
  const endAudioFile = endSessionAudio;
  const fadeIntervalRef = useRef(null);
  const [isFading, setIsFading] = useState(false);
  const originalVolumeRef = useRef(70); // Store original volume before fade

  // Fetch audio file from database based on frequency
  useEffect(() => {
    const loadAudioFile = async () => {
      setLoading(true);
      const audioData = await getAudioFileForFrequency(frequency);

      if (audioData && audioData.file_url) {
        setAudioFile(audioData.file_url);
      } else {
        console.error('No audio file found for frequency:', frequency);
        setAudioFile(null);
      }

      setLoading(false);
    };

    loadAudioFile();
  }, [frequency]);

  // Enable looping for demo files or short sessions (30 min or less)
  useEffect(() => {
    if (audioRef.current && audioFile) {
      const fileName = (audioFile || '').toLowerCase();
      const isDemoFile = fileName.includes('demo');
      const isShortSession = sessionDuration !== null && sessionDuration !== undefined && Number(sessionDuration) <= 30;
      
      // Enable looping if it's a demo file or short session
      if (isDemoFile || isShortSession) {
        audioRef.current.loop = true;
        console.log('🔄 Looping enabled for audio file (demo file or short session)');
      } else {
        audioRef.current.loop = false;
      }
    }
  }, [audioFile, sessionDuration]);

  // EndSession.m4a is imported as a local asset — no database fetch needed

  // Initialize session timer
  useEffect(() => {
    if (sessionDuration && sessionDuration > 0) {
      // Convert minutes to seconds
      setSessionTimeRemaining(sessionDuration * 60);
    }
  }, [sessionDuration]);

  // Session countdown timer with fade-out in last minute
  useEffect(() => {
    if (sessionTimeRemaining === null || sessionTimeRemaining <= 0) {
      return;
    }

    timerIntervalRef.current = setInterval(() => {
      setSessionTimeRemaining(prev => {
        if (prev <= 1) {
          // Timer expired - stop current audio and play end audio
          handleSessionEnd();
          return 0;
        }
        
        // Start fade-out in the last 60 seconds (1 minute)
        if (prev <= 60 && !isFading && audioRef.current) {
          setIsFading(true);
          startFadeOut();
        }
        
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [sessionTimeRemaining, isFading]);

  // Fade-out function: gradually reduce volume over 60 seconds
  const startFadeOut = () => {
    if (!audioRef.current) return;
    
    // Store original volume before fade starts
    originalVolumeRef.current = volume;
    
    // Get the actual current volume from the audio element
    const startVolume = audioRef.current.volume;
    const fadeDuration = 60; // 60 seconds
    const steps = 60; // Update every second
    const volumeStep = startVolume / steps;
    let currentStep = 0;

    console.log('🔉 Starting fade-out over 60 seconds from volume:', Math.round(startVolume * 100) + '%');

    fadeIntervalRef.current = setInterval(() => {
      if (!audioRef.current || sessionEnded) {
        if (fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
        }
        return;
      }

      currentStep++;
      const newVolume = Math.max(0, startVolume - (volumeStep * currentStep));
      audioRef.current.volume = newVolume;

      // Update the volume state to reflect the fade (for UI)
      setVolume(Math.round(newVolume * 100));

      if (currentStep >= steps || newVolume <= 0) {
        if (fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
        }
        audioRef.current.volume = 0;
        console.log('🔇 Fade-out complete');
      }
    }, 1000); // Update every second
  };

  const handleSessionEnd = () => {
    // Clear fade interval if running
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }

    // Stop current audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }

    // Play SessionEnd.mp3 on loop at original volume (not faded volume)
    if (endAudioRef.current && endAudioFile) {
      endAudioRef.current.loop = true;
      // Use the original volume before fade started
      const originalVolume = originalVolumeRef.current;
      endAudioRef.current.volume = originalVolume / 100;
      setVolume(originalVolume); // Restore volume display
      endAudioRef.current.play().catch(err => {
        console.error('Failed to play end audio:', err);
      });
    }

    setSessionEnded(true);
    setIsFading(false);

    // Notify parent component
    if (onSessionEnd) {
      onSessionEnd();
    }

    // Clear the interval
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      // If looping is enabled, don't stop playing
      if (!audio.loop) {
        setIsPlaying(false);
      }
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioFile]);

  useEffect(() => {
    // Only update volume if not currently fading out
    // This allows manual volume changes but prevents fade-out from being overridden
    if (audioRef.current && !isFading) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume, isFading]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(err => {
        console.error('Audio playback failed:', err);
        alert('Unable to play audio. Please check that the audio file exists.');
      });
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    audio.currentTime = duration * percentage;
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const formatSessionTime = (seconds) => {
    if (seconds === null || isNaN(seconds)) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (loading) {
    return (
      <div className="audio-player">
        <h3>🎵 Loading Audio...</h3>
      </div>
    );
  }

  if (!audioFile) {
    return (
      <div className="audio-player">
        <h3>⚠️ No audio file available for this frequency</h3>
        <p>Please upload an audio file in the admin panel that covers {frequency} Hz</p>
      </div>
    );
  }

  return (
    <div className="audio-player">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
        <h3 style={{margin: 0}}>
          {sessionEnded ? '⏰ Session Complete!' : '🎵 Healing Session Audio'}
        </h3>
        {sessionTimeRemaining !== null && (
          <div style={{
            fontSize: '24px',
            fontWeight: '700',
            color: sessionTimeRemaining <= 120 ? '#e11d48' : '#008e8c',
            padding: '8px 16px',
            background: sessionTimeRemaining <= 120 ? '#ffe5e5' : '#e7f7f4',
            borderRadius: '8px'
          }}>
            ⏱ {formatSessionTime(sessionTimeRemaining)}
          </div>
        )}
      </div>

      {sessionEnded && (
        <div style={{
          background: '#fef3c7',
          border: '2px solid #f59e0b',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '16px',
          textAlign: 'center'
        }}>
          <p style={{margin: 0, fontWeight: '600', color: '#92400e'}}>
            🎵 Session time complete! End session sound is now playing.
          </p>
          <p style={{margin: '8px 0 0 0', fontSize: '14px', color: '#78350f'}}>
            Please complete the Therapist Signature section below.
          </p>
        </div>
      )}

      <div className="waveform" onClick={handleSeek}>
        <div className="waveform-progress" style={{ width: `${progress}%` }}></div>
        <div className={`waveform-bars ${!isPlaying ? 'paused' : ''}`}>
          {[...Array(10)].map((_, i) => (
            <div key={i} className="bar"></div>
          ))}
        </div>
      </div>

      <div className="time-display">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      <div className="audio-controls">
        <button className="play-btn" onClick={togglePlay}>
          {isPlaying ? '⏸' : '▶'}
        </button>
        <div className="volume-control">
          <span className="volume-icon">🔊</span>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="volume-slider"
          />
          <span className="volume-display">{volume}%</span>
        </div>
      </div>

      <audio ref={audioRef} src={audioFile} preload="metadata">
        <source src={audioFile} type="audio/mpeg" />
        <source src={audioFile.replace('.mp3', '.wav')} type="audio/wav" />
      </audio>

      {/* EndSession.m4a audio element */}
      <audio ref={endAudioRef} src={endAudioFile} preload="metadata">
        <source src={endAudioFile} type="audio/mp4" />
      </audio>
    </div>
  );
};

export default AudioPlayer;
