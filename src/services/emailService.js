/**
 * EmailJS Service for sending notifications
 */

import emailjs from '@emailjs/browser';

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

// Initialize EmailJS
if (PUBLIC_KEY) {
  emailjs.init(PUBLIC_KEY);
}

/**
 * Send confirmation email to client
 * @param {Object} clientData - Client information
 * @param {Object} sessionData - Session information
 * @param {number} suggestedFrequency - Recommended frequency
 * @returns {Promise<Object>} Email send result
 */
export const sendClientConfirmation = async (clientData, sessionData, suggestedFrequency) => {
  if (!SERVICE_ID || !PUBLIC_KEY) {
    console.warn('EmailJS not configured - skipping client email');
    return { success: false, error: 'EmailJS not configured' };
  }

  try {
    const templateParams = {
      to_name: `${clientData.firstName} ${clientData.surname}`,
      to_email: clientData.email,
      session_date: sessionData.sessionDate,
      session_time: sessionData.sessionTime,
      suggested_frequency: suggestedFrequency,
      frequency_name: sessionData.frequencyName || 'Healing Frequency',
      reply_to: import.meta.env.VITE_PRACTITIONER_EMAIL || 'noreply@soundhealing.com'
    };

    const response = await emailjs.send(
      SERVICE_ID,
      'client_confirmation', // Template ID
      templateParams
    );

    console.log('Client email sent successfully:', response);
    return { success: true, response };
  } catch (error) {
    console.error('Error sending client email:', error);
    return { success: false, error: error.text || error.message };
  }
};

/**
 * Send notification to practitioner
 * @param {Object} clientData - Client information
 * @param {Object} sessionData - Session information
 * @returns {Promise<Object>} Email send result
 */
export const sendPractitionerNotification = async (clientData, sessionData) => {
  if (!SERVICE_ID || !PUBLIC_KEY) {
    console.warn('EmailJS not configured - skipping practitioner email');
    return { success: false, error: 'EmailJS not configured' };
  }

  const practitionerEmail = import.meta.env.VITE_PRACTITIONER_EMAIL;
  if (!practitionerEmail) {
    console.warn('Practitioner email not configured');
    return { success: false, error: 'Practitioner email not set' };
  }

  try {
    const templateParams = {
      to_email: practitionerEmail,
      client_name: `${clientData.firstName} ${clientData.surname}`,
      client_email: clientData.email,
      client_phone: clientData.phone,
      session_date: sessionData.sessionDate,
      session_time: sessionData.sessionTime,
      intention: Array.isArray(sessionData.intention) ? sessionData.intention.join(', ') : sessionData.intention,
      goal: sessionData.goalDescription || 'Not specified',
      health_concerns: Array.isArray(sessionData.healthConcerns)
        ? sessionData.healthConcerns.join(', ')
        : 'None',
      suggested_frequency: sessionData.frequencySuggested,
      frequency_name: sessionData.frequencyName || 'Unknown'
    };

    const response = await emailjs.send(
      SERVICE_ID,
      'practitioner_notification', // Template ID
      templateParams
    );

    console.log('Practitioner email sent successfully:', response);
    return { success: true, response };
  } catch (error) {
    console.error('Error sending practitioner email:', error);
    return { success: false, error: error.text || error.message };
  }
};

/**
 * Send comprehensive session summary email to client
 * @param {Object} sessionData - Complete session data from intake form
 * @param {Object} frequencyMetadata - Frequency information from database
 * @param {string} therapistNotes - Notes from therapist
 * @returns {Promise<Object>} Email send result
 */
export const sendSessionSummaryEmail = async (sessionData, frequencyMetadata, therapistNotes = '') => {
  if (!SERVICE_ID || !PUBLIC_KEY) {
    console.warn('EmailJS not configured - skipping session summary email');
    return { success: false, error: 'EmailJS not configured' };
  }

  try {
    const templateParams = {
      // Client information
      to_name: `${sessionData.firstName} ${sessionData.surname}`,
      to_email: sessionData.email,

      // Session details
      session_date: new Date(sessionData.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      session_time: sessionData.time,

      // Frequency information
      frequency_hz: `${frequencyMetadata.hz} Hz`,
      frequency_name: frequencyMetadata.name || 'Healing Frequency',
      frequency_family: frequencyMetadata.family || 'Universal',
      healing_properties: frequencyMetadata.healingProperties?.join(', ') || 'Balance and harmony',
      frequency_intentions: frequencyMetadata.primaryIntentions?.join(', ') || 'Wellness',

      // Client's session intentions
      client_intentions: sessionData.intention?.join(', ') || 'General wellness',
      goal_description: sessionData.goalDescription || 'Relaxation and balance',

      // Energy levels (pre-session)
      physical_energy: `${sessionData.physicalEnergy}/10`,
      emotional_balance: `${sessionData.emotionalBalance}/10`,
      mental_clarity: `${sessionData.mentalClarity}/10`,
      spiritual_connection: `${sessionData.spiritualConnection}/10`,

      // Emotional indicators
      emotional_indicators: sessionData.emotionalIndicators?.join(', ') || 'None',
      intuitive_messages: sessionData.intuitiveMessages || 'None shared',

      // Therapist notes
      therapist_notes: therapistNotes || 'Session completed successfully.',

      // Contact info
      reply_to: import.meta.env.VITE_PRACTITIONER_EMAIL || 'noreply@soundhealing.com'
    };

    const response = await emailjs.send(
      SERVICE_ID,
      'Vibro_Followup', // Template ID
      templateParams
    );

    console.log('✅ Session summary email sent successfully:', response);
    return { success: true, response };
  } catch (error) {
    console.error('❌ Error sending session summary email:', error);
    return { success: false, error: error.text || error.message };
  }
};

/**
 * Log email send attempt to database
 * @param {string} sessionId - Session UUID
 * @param {string} emailType - 'client_confirmation' or 'practitioner_notification'
 * @param {string} recipientEmail - Recipient email address
 * @param {boolean} success - Whether email was sent successfully
 * @param {string} errorMessage - Error message if failed
 */
export const logEmailSend = async (sessionId, emailType, recipientEmail, success, errorMessage = null) => {
  try {
    const { supabase } = await import('./supabaseClient');

    const { error} = await supabase
      .from('email_logs')
      .insert([
        {
          session_id: sessionId,
          email_type: emailType,
          recipient_email: recipientEmail,
          status: success ? 'sent' : 'failed',
          error_message: errorMessage,
          sent_at: success ? new Date().toISOString() : null
        }
      ]);

    if (error) throw error;
  } catch (error) {
    console.error('Error logging email send:', error);
  }
};
