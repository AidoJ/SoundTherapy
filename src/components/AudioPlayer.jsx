import React, { useState, useRef, useEffect } from 'react';
import { getAudioFileForFrequency } from '../services/audioMatcher';
import './AudioPlayer.css';

const AudioPlayer = ({ frequency }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(70);
  const [audioFile, setAudioFile] = useState(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

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
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

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
      <h3>🎵 Healing Session Audio</h3>

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
    </div>
  );
};

export default AudioPlayer;
