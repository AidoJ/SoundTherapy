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
 * Intelligent frequency matcher that uses audio file data from database.
 *
 * DB audio files (actual data):
 *   174 Hz (143-198) — Stress Relief, Pain/Tension, Sleep/Fatigue
 *   285 Hz           — Energy Reset, Tissue Repair, Immune System
 *   396 Hz           — Fear Release, Guilt Release, Grounding
 *   417 Hz           — Emotional Release, Trauma Healing, Change Facilitation
 *   432 Hz (426-438) — Stress Relief, Sleep/Fatigue, Energy Reset
 *   528 Hz (487-542) — Energy Reset, Stress Relief, Heart Healing
 *   639 Hz (598-690) — Emotional Release, Sleep/Fatigue, Heart Healing
 *   741 Hz (691-759) — Clarity/Focus, Energy Reset, Purification
 *   852 Hz           — Spiritual Realignment, Clarity/Focus, Intuition
 *   963 Hz (927-1000)— Spiritual Realignment, Sleep/Fatigue, Deep Meditation
 *   + 2 demos (185, 190) and SessionEnd (filtered out)
 */
export const matchAudioFile = async (formData) => {
  console.log('🎯 === AUDIO MATCHER START ===');
  console.log('📝 Form Data:', JSON.stringify(formData, null, 2));

  const allAudioFiles = await fetchAudioFilesWithMetadata();

  if (!allAudioFiles || allAudioFiles.length === 0) {
    console.error('❌ No audio files found in database');
    return 432;
  }

  // Filter out SessionEnd and demo files — only score actual healing frequencies
  const audioFiles = allAudioFiles.filter(audio => {
    const name = (audio.file_name || '').toLowerCase();
    return !name.includes('sessionend') &&
           !name.includes('session_end') &&
           !name.includes('demo');
  });

  if (audioFiles.length === 0) {
    console.error('❌ No healing audio files found after filtering');
    return 432;
  }

  console.log('🎵 Scoring', audioFiles.length, 'healing files');

  // Initialize scores
  const scores = {};
  audioFiles.forEach(audio => {
    const key = audio.id;
    scores[key] = {
      score: 0,
      audioFile: audio,
      frequency: audio.frequency_min
    };
  });

  // Helper: check if any healing_properties match any keyword
  const propsMatch = (audio, keywords) => {
    if (!audio.healing_properties || !Array.isArray(audio.healing_properties)) return false;
    return audio.healing_properties.some(prop => {
      if (!prop) return false;
      const lower = prop.toLowerCase();
      return keywords.some(kw => lower.includes(kw));
    });
  };

  // Helper: check if any primary_intentions match any keyword
  const intentionsMatch = (audio, keywords) => {
    if (!audio.primary_intentions || !Array.isArray(audio.primary_intentions)) return false;
    return audio.primary_intentions.some(intent => {
      if (!intent) return false;
      const lower = intent.toLowerCase();
      return keywords.some(kw => lower.includes(kw));
    });
  };

  // --- SCORING ---
  // Each frequency has a PRIMARY purpose. Score by giving the highest points
  // only to the best-fit frequencies for each symptom, not all that loosely match.
  //
  // Frequency ownership:
  //   174 Hz — PRIMARY: physical pain/tension
  //   285 Hz — PRIMARY: tissue repair, immune, physical recovery
  //   396 Hz — PRIMARY: fear, guilt, deep anxiety
  //   417 Hz — PRIMARY: emotional trauma, emotional release
  //   432 Hz — PRIMARY: general calm, mild stress (default/balanced)
  //   528 Hz — PRIMARY: heart healing, love, energy/vitality
  //   639 Hz — PRIMARY: relationships, empathy, emotional connection
  //   741 Hz — PRIMARY: mental clarity, focus, detox
  //   852 Hz — PRIMARY: intuition, spiritual clarity, awakening
  //   963 Hz — PRIMARY: deep meditation, sleep, spiritual peace

  const painLevel = formData.painLevel ?? 0;
  const stressLevel = formData.stressAnxietyLevel ?? 0;
  const sleepQuality = formData.sleepQuality ?? 5;
  const mainPainAreas = formData.mainPainAreas || [];
  const primaryGoals = formData.primaryGoals || [];

  // Helper: add points to file matching a freq range
  const addByFreq = (minHz, maxHz, pts) => {
    audioFiles.forEach(audio => {
      if (audio.frequency_min >= minHz && audio.frequency_min <= maxHz) {
        scores[audio.id].score += pts;
      }
    });
  };

  // 1. PAIN — high pain → 174 (primary), 285 (secondary)
  if (painLevel >= 1) {
    const pts = painLevel >= 7 ? 12 : painLevel >= 4 ? 7 : 3;
    addByFreq(143, 198, pts);       // 174 Hz — Pain/Tension (primary)
    addByFreq(285, 285, pts - 2);   // 285 Hz — Tissue Repair (secondary)
    addByFreq(426, 438, 2);         // 432 Hz — mild general support
  }

  // 2. STRESS/ANXIETY — high stress → 396, 417 (primary), 432, 528 (secondary)
  if (stressLevel >= 1) {
    const pts = stressLevel >= 7 ? 12 : stressLevel >= 4 ? 7 : 3;
    addByFreq(396, 396, pts);       // 396 Hz — Fear/Guilt Release (primary)
    addByFreq(417, 417, pts);       // 417 Hz — Emotional/Trauma (primary)
    addByFreq(487, 542, pts - 2);   // 528 Hz — Stress Relief (secondary)
    addByFreq(426, 438, pts - 3);   // 432 Hz — General calm (secondary)
    addByFreq(598, 690, pts - 4);   // 639 Hz — Emotional connection
  }

  // 3. SLEEP — poor sleep → 963 (primary), 639 (secondary), 432 (mild)
  if (sleepQuality <= 4) {
    const pts = sleepQuality <= 1 ? 12 : sleepQuality <= 2 ? 8 : sleepQuality <= 3 ? 5 : 2;
    addByFreq(927, 1000, pts);      // 963 Hz — Deep Meditation/Sleep (primary)
    addByFreq(598, 690, pts - 2);   // 639 Hz — Sleep/Fatigue (secondary)
    addByFreq(852, 852, pts - 3);   // 852 Hz — Spiritual calm
    addByFreq(426, 438, 2);         // 432 Hz — mild general support
  }

  // 4. MAIN PAIN AREAS (walk-in form chips)
  if (mainPainAreas.length > 0) {
    const w = primaryGoals.length > 0 ? 6 : 10;

    mainPainAreas.forEach(area => {
      const lower = area.toLowerCase();

      if (lower.includes('fibromyalgia') || lower.includes('widespread')) {
        addByFreq(143, 198, w + 4); // 174 Hz — strong preference
        addByFreq(285, 285, w);     // 285 Hz — tissue/immune
      } else if (lower.includes('headache') || lower.includes('migraine')) {
        addByFreq(691, 759, w + 2); // 741 Hz — Clarity/Purification (best for head)
        addByFreq(143, 198, w);     // 174 Hz — Pain/Tension
      } else if (lower.includes('back') || lower.includes('neck') || lower.includes('shoulder') || lower.includes('joint')) {
        addByFreq(143, 198, w);     // 174 Hz — Pain/Tension
        addByFreq(285, 285, w);     // 285 Hz — Tissue Repair
      } else if (lower.includes('chest') || lower.includes('heart')) {
        addByFreq(487, 542, w + 2); // 528 Hz — Heart Healing
        addByFreq(598, 690, w);     // 639 Hz — Emotional/Heart
      } else if (lower.includes('anxiety') || lower.includes('emotional')) {
        addByFreq(396, 396, w);     // 396 Hz — Fear/Guilt
        addByFreq(417, 417, w);     // 417 Hz — Emotional Release
      } else if (lower.includes('stomach') || lower.includes('digestion')) {
        addByFreq(487, 542, w);     // 528 Hz — Energy Reset
        addByFreq(691, 759, w);     // 741 Hz — Purification
      } else {
        // General pain area — mild boost to pain frequencies
        addByFreq(143, 198, Math.round(w / 2));
        addByFreq(285, 285, Math.round(w / 2));
      }
    });
  }

  // 5. PRIMARY GOALS (from full intake form)
  if (primaryGoals.length > 0) {
    primaryGoals.forEach(goal => {
      const lower = goal.toLowerCase();
      audioFiles.forEach(audio => {
        if (intentionsMatch(audio, [lower])) {
          scores[audio.id].score += 15;
        }
        if (propsMatch(audio, [lower])) {
          scores[audio.id].score += 10;
        }
      });
    });
  }

  // 6. HEALTH CONCERNS
  if (formData.healthConcerns && formData.healthConcerns.length > 0) {
    formData.healthConcerns.forEach(concern => {
      if (concern === 'none') return;
      const lower = concern.toLowerCase();
      audioFiles.forEach(audio => {
        if (propsMatch(audio, [lower]) || intentionsMatch(audio, [lower])) {
          scores[audio.id].score += 4;
        }
      });
    });
  }

  // --- FIND WINNER ---

  const scoreSummary = audioFiles.map(audio => ({
    file: audio.file_name,
    freq: audio.frequency_min,
    score: scores[audio.id].score
  }));
  console.log('📊 Scores:', JSON.stringify(scoreSummary, null, 2));

  let maxScore = 0;
  let topMatches = [];

  Object.values(scores).forEach(entry => {
    if (entry.score > maxScore) {
      maxScore = entry.score;
      topMatches = [entry];
    } else if (entry.score === maxScore && entry.score > 0) {
      topMatches.push(entry);
    }
  });

  if (topMatches.length > 0) {
    const pick = topMatches[Math.floor(Math.random() * topMatches.length)];
    console.log('✅ Selected:', pick.audioFile.file_name, 'score:', pick.score);
    matchAudioFile.selectedAudioFile = pick.audioFile;
    return pick.frequency;
  }

  // Fallback: 432 Hz
  const fallback432 = audioFiles.find(
    audio => audio.frequency_min <= 432 && audio.frequency_max >= 432
  );

  if (fallback432) {
    console.log('⚠️ No match — fallback 432 Hz');
    matchAudioFile.selectedAudioFile = fallback432;
    return fallback432.frequency_min;
  }

  // Last resort: first available file
  const first = audioFiles[0];
  console.log('⚠️ Using first available:', first.file_name);
  matchAudioFile.selectedAudioFile = first;
  return first.frequency_min;
};

/**
 * Get audio file URL from Supabase based on frequency
 */
export const getAudioFileForFrequency = async (frequency) => {
  try {
    console.log('🔍 Looking for audio file for frequency:', frequency);

    // Use pre-selected file if available
    if (matchAudioFile.selectedAudioFile) {
      console.log('✅ Using pre-selected:', matchAudioFile.selectedAudioFile.file_name);
      return matchAudioFile.selectedAudioFile;
    }

    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Query timed out')), 8000)
    );

    const query = supabase
      .from('audio_files')
      .select('*')
      .lte('frequency_min', frequency)
      .gte('frequency_max', frequency);

    const { data, error } = await Promise.race([query, timeout]);

    if (error) {
      console.error('Error fetching audio file:', error);
      return null;
    }

    if (!data || data.length === 0) {
      console.log('No audio file found for frequency:', frequency);
      return null;
    }

    // Filter out SessionEnd if it matches the range
    const healing = data.filter(f => !(f.file_name || '').toLowerCase().includes('sessionend'));
    const selectedFile = healing.length > 0 ? healing[0] : data[0];
    console.log('Selected audio file:', selectedFile.file_name);
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
 */
export const getClosestSolfeggioFrequency = async (algorithmFrequency) => {
  try {
    console.log('🔍 Finding closest Solfeggio frequency for:', algorithmFrequency);

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
