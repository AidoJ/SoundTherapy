/**
 * Supabase Client Configuration
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables!');
  console.log('Please create a .env file with:');
  console.log('VITE_SUPABASE_URL=your_supabase_url');
  console.log('VITE_SUPABASE_ANON_KEY=your_supabase_anon_key');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Save client data to Supabase
 * @param {Object} clientData - Client information
 * @returns {Promise<Object>} Created client record
 */
export const saveClient = async (clientData) => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .insert([
        {
          first_name: clientData.firstName,
          surname: clientData.surname,
          email: clientData.email,
          phone: clientData.phone,
          date_of_birth: clientData.dateOfBirth,
          gender: clientData.gender
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error saving client:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Save session data to Supabase
 * @param {Object} sessionData - Session information
 * @returns {Promise<Object>} Created session record
 */
export const saveSession = async (sessionData) => {
  try {
    const { data, error} = await supabase
      .from('sessions')
      .insert([sessionData])
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error saving session:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all frequencies from database
 * @returns {Promise<Array>} List of frequencies
 */
export const getFrequencies = async () => {
  try {
    const { data, error } = await supabase
      .from('frequencies')
      .select('*')
      .order('frequency_hz', { ascending: true });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching frequencies:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get audio file for a specific frequency
 * @param {number} frequencyHz - Frequency in Hz
 * @returns {Promise<Object>} Audio file data
 */
export const getAudioFileForFrequency = async (frequencyHz) => {
  try {
    const { data, error } = await supabase
      .from('audio_files')
      .select('*')
      .lte('frequency_range_min', frequencyHz)
      .gte('frequency_range_max', frequencyHz)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching audio file:', error);
    // Return fallback for development
    return {
      success: true,
      data: {
        file_url: '/Music/Grounding - 174Hz.mp3',
        file_type: 'mp3',
        frequency_name: frequencyHz.toString()
      }
    };
  }
};

/**
 * Upload audio file to Supabase Storage
 * @param {File} file - Audio file to upload
 * @param {string} fileName - File name
 * @returns {Promise<Object>} Upload result
 */
export const uploadAudioFile = async (file, fileName) => {
  try {
    const { data, error } = await supabase.storage
      .from('audio-files')
      .upload(`frequencies/${fileName}`, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('audio-files')
      .getPublicUrl(`frequencies/${fileName}`);

    return { success: true, data: { ...data, publicUrl } };
  } catch (error) {
    console.error('Error uploading audio file:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get client by email
 * @param {string} email - Client email
 * @returns {Promise<Object>} Client data
 */
export const getClientByEmail = async (email) => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching client:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get sessions for a client
 * @param {string} clientId - Client UUID
 * @returns {Promise<Array>} List of sessions
 */
export const getClientSessions = async (clientId) => {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('client_id', clientId)
      .order('session_date', { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return { success: false, error: error.message };
  }
};
