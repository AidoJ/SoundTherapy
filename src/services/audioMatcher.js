import { supabase } from './supabaseClient';

/**
 * Fetch all audio files with their metadata from the database
 */
export const fetchAudioFilesWithMetadata = async () => {
  try {
    console.log('🔄 Fetching audio files from database...');

    // Timeout after 8 seconds so the app never hangs
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Supabase query timed out after 8s')), 8000)
    );

    const query = supabase
      .from('audio_files')
      .select('*')
      .order('frequency_min', { ascending: true });

    const { data, error } = await Promise.race([query, timeout]);

    if (error) {
      console.error('❌ Error fetching audio files:', error);
      return [];
    }

    console.log('✅ Fetched', (data || []).length, 'audio files:', (data || []).map(f => f.file_name));
    return data || [];
  } catch (err) {
    console.error('❌ Exception in fetchAudioFilesWithMetadata:', err);
    return [];
  }
};

/**
 * Intelligent frequency matcher that dynamically uses audio file data from database
 * to select the most appropriate audio file
 * Returns: { frequency: number, audioFile: object } or just frequency (for backward compatibility)
 */
export const matchAudioFile = async (formData) => {
  console.log('🎯 === AUDIO MATCHER DEBUG START ===');
  console.log('📝 Form Data Received:', JSON.stringify(formData, null, 2));

  // Fetch all audio files from database
  const allAudioFiles = await fetchAudioFilesWithMetadata();

  if (!allAudioFiles || allAudioFiles.length === 0) {
    console.error('❌ No audio files found in database');
    return 432; // Default fallback
  }

  // Filter out non-healing files (e.g. SessionEnd.mp3) — only score actual frequency files
  const audioFiles = allAudioFiles.filter(audio => {
    const name = (audio.file_name || '').toLowerCase();
    return !name.includes('sessionend') && !name.includes('session_end');
  });

  if (audioFiles.length === 0) {
    console.error('❌ No healing audio files found after filtering');
    return 432;
  }

  // SIMPLE LOGIC: If session <= 30 minutes, pick a random demo file
  const sessionDuration = formData.sessionDuration;
  const sessionDurationNum = sessionDuration !== null && sessionDuration !== undefined 
    ? Number(sessionDuration) 
    : null;
  
  if (sessionDurationNum !== null && !isNaN(sessionDurationNum) && sessionDurationNum <= 30) {
    console.log('⏱️ Short session (≤30 min) - using symptom scoring to select frequency');
  }

  // ELSE: Continue with normal matching process (original logic)
  const scores = {};

  // Initialize scores for all audio files
  audioFiles.forEach(audio => {
    const key = `${audio.frequency_min}-${audio.frequency_max}`;
    scores[key] = {
      score: 0,
      audioFile: audio,
      frequency: audio.frequency_min // Use min frequency as representative
    };
  });

  console.log('📊 Initial Scores:', JSON.stringify(scores, null, 2));

  // 1. PRIMARY SCORING: Primary Goals (Highest weight: 15 points)
  // Uses primaryGoals from new intake form
  const goals = formData.primaryGoals || formData.intention || [];
  if (goals && goals.length > 0) {
    goals.forEach(goal => {
      audioFiles.forEach(audio => {
        const key = `${audio.frequency_min}-${audio.frequency_max}`;

        // Check if primary_intentions array includes this goal
        if (audio.primary_intentions && audio.primary_intentions.includes(goal)) {
          scores[key].score += 15;
        }

        // Fuzzy matching for goals that might be worded differently
        if (audio.primary_intentions) {
          const lowerGoal = goal.toLowerCase();
          const matchesIntent = audio.primary_intentions.some(intent =>
            intent.toLowerCase().includes(lowerGoal) ||
            lowerGoal.includes(intent.toLowerCase())
          );
          if (matchesIntent) {
            scores[key].score += 12;
          }
        }

        // Check harmonic connections for related support (5 points)
        if (audio.harmonic_connections && Array.isArray(audio.harmonic_connections)) {
          audio.harmonic_connections.forEach(relatedHz => {
            const relatedAudio = audioFiles.find(a =>
              a.frequency_min <= relatedHz && a.frequency_max >= relatedHz
            );
            if (relatedAudio && relatedAudio.primary_intentions) {
              const matchesRelated = relatedAudio.primary_intentions.some(intent =>
                intent.toLowerCase().includes(goal.toLowerCase()) ||
                goal.toLowerCase().includes(intent.toLowerCase())
              );
              if (matchesRelated) {
                scores[key].score += 5;
              }
            }
          });
        }
      });
    });
  }

  // 2. MANUAL FREQUENCY SELECTION (Weight: 10 points)
  if (formData.selectedFrequencies && formData.selectedFrequencies.length > 0) {
    formData.selectedFrequencies.forEach(selectedHz => {
      audioFiles.forEach(audio => {
        const key = `${audio.frequency_min}-${audio.frequency_max}`;
        // Check if selected frequency is in this audio file's range
        if (selectedHz >= audio.frequency_min && selectedHz <= audio.frequency_max) {
          scores[key].score += 10;
        }
      });
    });
  }

  // 3. EMOTIONAL INDICATORS (Weight: 6 points)
  if (formData.emotionalIndicators && formData.emotionalIndicators.length > 0) {
    formData.emotionalIndicators.forEach(indicator => {
      audioFiles.forEach(audio => {
        const key = `${audio.frequency_min}-${audio.frequency_max}`;

        if (audio.healing_properties && Array.isArray(audio.healing_properties)) {
          const lowerIndicator = indicator.toLowerCase();
          const matchesProperty = audio.healing_properties.some(prop =>
            prop.toLowerCase().includes(lowerIndicator) ||
            lowerIndicator.includes(prop.toLowerCase())
          );

          if (matchesProperty) {
            scores[key].score += 6;
          }
        }
      });
    });
  }

  // 4. SYMPTOM LEVELS (Graduated scoring: 2/5/8 points based on severity)
  const painLevel = formData.painLevel ?? formData.physicalEnergy ?? 0;
  const stressLevel = formData.stressAnxietyLevel ?? formData.emotionalBalance ?? 0;
  const sleepQuality = formData.sleepQuality ?? 5;

  audioFiles.forEach(audio => {
    const key = `${audio.frequency_min}-${audio.frequency_max}`;

    if (!audio.healing_properties) return;

    // Pain: graduated scoring (1-3 = +2, 4-6 = +5, 7-10 = +8)
    if (painLevel >= 1) {
      const painScore = painLevel >= 7 ? 8 : painLevel >= 4 ? 5 : 2;
      const hasRelevantProperty = audio.healing_properties.some(prop =>
        prop.toLowerCase().includes('pain') ||
        prop.toLowerCase().includes('inflammation') ||
        prop.toLowerCase().includes('relief') ||
        prop.toLowerCase().includes('tension')
      );
      if (hasRelevantProperty) scores[key].score += painScore;
    }

    // Stress: graduated scoring (1-3 = +2, 4-6 = +5, 7-10 = +8)
    if (stressLevel >= 1) {
      const stressScore = stressLevel >= 7 ? 8 : stressLevel >= 4 ? 5 : 2;
      const hasRelevantProperty = audio.healing_properties.some(prop =>
        prop.toLowerCase().includes('stress') ||
        prop.toLowerCase().includes('anxiety') ||
        prop.toLowerCase().includes('calm') ||
        prop.toLowerCase().includes('emotional') ||
        prop.toLowerCase().includes('harmony')
      );
      if (hasRelevantProperty) scores[key].score += stressScore;
    }

    // Sleep: graduated scoring (quality 3 = +2, quality 2 = +5, quality 1 = +8)
    if (sleepQuality <= 3) {
      const sleepScore = sleepQuality <= 1 ? 8 : sleepQuality <= 2 ? 5 : 2;
      const hasRelevantProperty = audio.healing_properties.some(prop =>
        prop.toLowerCase().includes('sleep') ||
        prop.toLowerCase().includes('insomnia') ||
        prop.toLowerCase().includes('relaxation') ||
        prop.toLowerCase().includes('fatigue')
      );
      if (hasRelevantProperty) scores[key].score += sleepScore;
    }
  });

  // 5. MAIN PAIN AREAS (Weight: 10 points when no primaryGoals, else 6 points)
  const hasPrimaryGoals = (formData.primaryGoals && formData.primaryGoals.length > 0) ||
                          (formData.intention && formData.intention.length > 0);
  const painAreaWeight = hasPrimaryGoals ? 6 : 10;

  if (formData.mainPainAreas && formData.mainPainAreas.length > 0) {
    formData.mainPainAreas.forEach(area => {
      audioFiles.forEach(audio => {
        const key = `${audio.frequency_min}-${audio.frequency_max}`;

        if (!audio.healing_properties) return;

        const lowerArea = area.toLowerCase();

        // Special case: Fibromyalgia -> 174 Hz
        if (lowerArea.includes('fibromyalgia') || lowerArea.includes('widespread')) {
          if (audio.frequency_min <= 174 && audio.frequency_max >= 174) {
            scores[key].score += 10; // Strong preference for 174 Hz
          }
        }

        // Match pain area keywords
        const matchesProperty = audio.healing_properties.some(prop =>
          prop.toLowerCase().includes(lowerArea) ||
          prop.toLowerCase().includes('pain') ||
          (lowerArea.includes('headache') && prop.toLowerCase().includes('migraine'))
        );

        if (matchesProperty) {
          scores[key].score += painAreaWeight;
        }
      });
    });
  }

  // 6. HEALTH CONCERNS / SAFETY SCREEN (Weight: 4 points)
  if (formData.healthConcerns && formData.healthConcerns.length > 0) {
    formData.healthConcerns.forEach(concern => {
      // Skip 'none' - it's not a real concern
      if (concern === 'none') return;

      audioFiles.forEach(audio => {
        const key = `${audio.frequency_min}-${audio.frequency_max}`;

        if (!audio.healing_properties) return;

        const lowerConcern = concern.toLowerCase();
        const matchesProperty = audio.healing_properties.some(prop =>
          prop.toLowerCase().includes(lowerConcern) ||
          lowerConcern.includes(prop.toLowerCase())
        );

        if (matchesProperty) {
          scores[key].score += 4;
        }
      });
    });
  }

  // Find the highest scoring audio file(s)
  let maxScore = 0;
  let topMatches = [];

  console.log('📊 Scoring results:', Object.entries(scores).map(([key, data]) => ({
    key,
    fileName: data.audioFile?.file_name,
    score: data.score,
    frequency: data.frequency
  })));

  Object.entries(scores).forEach(([key, data]) => {
    if (data.score > maxScore) {
      maxScore = data.score;
      topMatches = [data]; // New highest score - reset array with this match
    } else if (data.score === maxScore && data.score > 0) {
      topMatches.push(data); // Same score - add to candidates
    }
  });

  // Randomly select from top matches if multiple files have same score
  let selectedMatch = null;
  if (topMatches.length > 0) {
    const randomIndex = Math.floor(Math.random() * topMatches.length);
    selectedMatch = topMatches[randomIndex];
  }

  const recommendedFrequency = selectedMatch?.frequency || null;
  const selectedAudioFile = selectedMatch?.audioFile || null;

  console.log('🎯 Selection process:', {
    topMatchesCount: topMatches.length,
    maxScore,
    selectedMatch: selectedMatch ? {
      fileName: selectedMatch.audioFile?.file_name,
      frequency: selectedMatch.frequency,
      score: selectedMatch.score
    } : null
  });

  // FALLBACK SYSTEM:
  // 1. If we found a match (score > 0), use it
  if (maxScore > 0 && recommendedFrequency) {
    console.log('✅ Matched Frequency:', recommendedFrequency, 'with score:', maxScore);
    console.log('Selected Audio File:', selectedAudioFile?.file_name);
    
    // Store the selected audio file for later retrieval
    if (selectedAudioFile) {
      matchAudioFile.selectedAudioFile = selectedAudioFile;
    }
    
    return recommendedFrequency;
  }

  // 2. Try 432 Hz (Universal Balance) as default fallback
  const fallback432 = audioFiles.find(
    audio => audio.frequency_min <= 432 && audio.frequency_max >= 432
  );

  if (fallback432) {
    console.log('⚠️ No match found - Using fallback: 432 Hz (Earth Resonance)');
    matchAudioFile.selectedAudioFile = fallback432;
    return 432;
  }

  // 3. Use the first available audio file in database
  if (audioFiles.length > 0) {
    const firstAvailable = audioFiles[0];
    console.log('⚠️ No 432 Hz available - Using first available audio file:', firstAvailable.file_name);
    matchAudioFile.selectedAudioFile = firstAvailable;
    return firstAvailable.frequency_min;
  }

  // 4. Last resort - return 432 Hz even if file doesn't exist (will show error to user)
  console.error('❌ No audio files available in database!');
  matchAudioFile.selectedAudioFile = null;
  return 432;
};

/**
 * Get audio file URL from Supabase based on frequency
 * If matchAudioFile was called first, it will use the pre-selected audio file
 */
export const getAudioFileForFrequency = async (frequency) => {
  try {
    console.log('🔍 Looking for audio file for frequency:', frequency);
    
    // Check if matchAudioFile already selected a specific file
    // This is important for short sessions where we want demo files only
    if (matchAudioFile.selectedAudioFile) {
      console.log('✅ Using pre-selected audio file from matchAudioFile:', matchAudioFile.selectedAudioFile.file_name);
      // DON'T clear it - AudioPlayer may call this multiple times
      return matchAudioFile.selectedAudioFile;
    }

    // Query audio_files table for matching frequency
    // We want: frequency_min <= frequency <= frequency_max
    let query = supabase
      .from('audio_files')
      .select('*')
      .lte('frequency_min', frequency)  // frequency_min <= target
      .gte('frequency_max', frequency); // frequency_max >= target

    const { data, error } = await query;

    console.log('Query result:', { data, error });

    if (error) {
      console.error('Error fetching audio file:', error);
      return null;
    }

    if (!data || data.length === 0) {
      console.log('No audio file found for frequency:', frequency);
      return null;
    }

    // If multiple matches, prefer demo files (for frequencies 185 or 190 which are demo files)
    if (data.length > 1 && (frequency === 185 || frequency === 190)) {
      const demoFile = data.find(file => {
        const fileName = (file.file_name || '').toLowerCase();
        const fileUrl = (file.file_url || '').toLowerCase();
        return fileName.includes('demo') || fileUrl.includes('demo');
      });
      if (demoFile) {
        console.log('✅ Found demo file for frequency:', demoFile.file_name);
        return demoFile;
      }
    }

    // If multiple matches, return the first one
    const selectedFile = Array.isArray(data) ? data[0] : data;
    console.log('Selected audio file:', selectedFile);
    return selectedFile;
  } catch (err) {
    console.error('Error in getAudioFileForFrequency:', err);
    return null;
  }
};

/**
 * Get frequency metadata from database for display
 */
export const getFrequencyMetadata = async (frequency) => {
  const allFiles = await fetchAudioFilesWithMetadata();
  const audioFiles = allFiles.filter(audio => {
    const name = (audio.file_name || '').toLowerCase();
    return !name.includes('sessionend') && !name.includes('session_end');
  });

  const matchingFile = audioFiles.find(
    audio => audio.frequency_min <= frequency && audio.frequency_max >= frequency
  );

  if (matchingFile) {
    return {
      hz: frequency,
      name: matchingFile.file_name,
      relatedFrequencies: matchingFile.harmonic_connections || [],
      primaryIntentions: matchingFile.primary_intentions || [],
      healingProperties: matchingFile.healing_properties || [],
      family: matchingFile.frequency_family || 'Unknown'
    };
  }

  return {
    hz: frequency,
    name: 'Unknown Frequency',
    relatedFrequencies: [],
    primaryIntentions: [],
    healingProperties: [],
    family: 'Unknown'
  };
};

/**
 * Find the closest Solfeggio frequency from the frequencies table
 * @param {number} algorithmFrequency - The frequency returned by the algorithm
 * @returns {object} - Closest Solfeggio frequency with name, description, etc.
 */
export const getClosestSolfeggioFrequency = async (algorithmFrequency) => {
  try {
    console.log('🔍 Finding closest Solfeggio frequency for:', algorithmFrequency);

    // Fetch all Solfeggio frequencies from the frequencies table
    const { data: frequencies, error } = await supabase
      .from('frequencies')
      .select('*')
      .order('frequency_hz', { ascending: true });

    if (error) {
      console.error('Error fetching Solfeggio frequencies:', error);
      return null;
    }

    if (!frequencies || frequencies.length === 0) {
      console.log('No Solfeggio frequencies found in database');
      return null;
    }

    // Find the closest frequency
    let closestFreq = frequencies[0];
    let minDifference = Math.abs(frequencies[0].frequency_hz - algorithmFrequency);

    frequencies.forEach(freq => {
      const difference = Math.abs(freq.frequency_hz - algorithmFrequency);
      if (difference < minDifference) {
        minDifference = difference;
        closestFreq = freq;
      }
    });

    console.log('✅ Closest Solfeggio:', closestFreq.frequency_hz, 'Hz -', closestFreq.frequency_name);

    return {
      hz: closestFreq.frequency_hz,
      name: closestFreq.frequency_name || 'Unknown',
      description: closestFreq.description || '',
      benefits: closestFreq.benefits || [],
      chakra: closestFreq.chakra || '',
      note: closestFreq.note || ''
    };
  } catch (err) {
    console.error('Error in getClosestSolfeggioFrequency:', err);
    return null;
  }
};
