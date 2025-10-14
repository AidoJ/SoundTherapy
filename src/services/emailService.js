/**
 * EmailJS Service for sending notifications
 */

import emailjs from '@emailjs/browser';

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

// Template IDs - can be overridden by environment variables
const CLIENT_CONFIRMATION_TEMPLATE = import.meta.env.VITE_EMAILJS_CLIENT_TEMPLATE || 'client_confirmation';
const PRACTITIONER_NOTIFICATION_TEMPLATE = import.meta.env.VITE_EMAILJS_PRACTITIONER_TEMPLATE || 'practitioner_notification';
const SESSION_SUMMARY_TEMPLATE = import.meta.env.VITE_EMAILJS_SUMMARY_TEMPLATE || 'Vibro_Followup';

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
      CLIENT_CONFIRMATION_TEMPLATE,
      templateParams
    );

    console.log('Client email sent successfully:', response);
    return { success: true, response };
  } catch (error) {
    console.error('Error sending client email:', error);
    const errorMessage = error.text || error.message || 'Unknown error';
    
    // Provide specific guidance for template not found errors
    if (errorMessage.includes('template ID not found') || errorMessage.includes('Template ID not found')) {
      console.error(`❌ EmailJS Template '${CLIENT_CONFIRMATION_TEMPLATE}' not found. Please create this template in your EmailJS dashboard.`);
    }
    
    return { success: false, error: errorMessage };
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
      PRACTITIONER_NOTIFICATION_TEMPLATE,
      templateParams
    );

    console.log('Practitioner email sent successfully:', response);
    return { success: true, response };
  } catch (error) {
    console.error('Error sending practitioner email:', error);
    const errorMessage = error.text || error.message || 'Unknown error';
    
    // Provide specific guidance for template not found errors
    if (errorMessage.includes('template ID not found') || errorMessage.includes('Template ID not found')) {
      console.error(`❌ EmailJS Template '${PRACTITIONER_NOTIFICATION_TEMPLATE}' not found. Please create this template in your EmailJS dashboard.`);
    }
    
    return { success: false, error: errorMessage };
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
    // Ensure frequencyMetadata has required structure
    if (!frequencyMetadata || !frequencyMetadata.hz) {
      console.error('Invalid frequencyMetadata:', frequencyMetadata);
      return { success: false, error: 'Invalid frequency metadata' };
    }

    const templateParams = {
      // Client information
      to_name: `${sessionData.firstName || ''} ${sessionData.surname || ''}`.trim() || 'Valued Client',
      to_email: sessionData.email || '',

      // Session details
      session_date: sessionData.date ? new Date(sessionData.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }) : 'Not specified',
      session_time: sessionData.time || 'Not specified',

      // Frequency information
      frequency_hz: `${frequencyMetadata.hz} Hz`,
      frequency_name: frequencyMetadata.name || 'Healing Frequency',
      frequency_family: frequencyMetadata.family || 'Universal',
      healing_properties: (Array.isArray(frequencyMetadata.healingProperties) && frequencyMetadata.healingProperties.length > 0)
        ? frequencyMetadata.healingProperties.join(', ')
        : 'Balance and harmony',
      frequency_intentions: (Array.isArray(frequencyMetadata.primaryIntentions) && frequencyMetadata.primaryIntentions.length > 0)
        ? frequencyMetadata.primaryIntentions.join(', ')
        : 'Wellness',

      // Client's session intentions
      client_intentions: (Array.isArray(sessionData.intention) && sessionData.intention.length > 0)
        ? sessionData.intention.join(', ')
        : 'General wellness',
      goal_description: sessionData.goalDescription || 'Relaxation and balance',

      // Energy levels (pre-session)
      physical_energy: sessionData.physicalEnergy ? `${sessionData.physicalEnergy}/10` : 'Not rated',
      emotional_balance: sessionData.emotionalBalance ? `${sessionData.emotionalBalance}/10` : 'Not rated',
      mental_clarity: sessionData.mentalClarity ? `${sessionData.mentalClarity}/10` : 'Not rated',
      spiritual_connection: sessionData.spiritualConnection ? `${sessionData.spiritualConnection}/10` : 'Not rated',

      // Emotional indicators
      emotional_indicators: (Array.isArray(sessionData.emotionalIndicators) && sessionData.emotionalIndicators.length > 0)
        ? sessionData.emotionalIndicators.join(', ')
        : 'None',
      intuitive_messages: sessionData.intuitiveMessages || 'None shared',

      // Therapist notes
      therapist_notes: therapistNotes || 'Session completed successfully.',

      // Contact info
      reply_to: import.meta.env.VITE_PRACTITIONER_EMAIL || 'noreply@soundhealing.com'
    };

    const response = await emailjs.send(
      SERVICE_ID,
      SESSION_SUMMARY_TEMPLATE,
      templateParams
    );

    console.log('✅ Session summary email sent successfully:', response);
    return { success: true, response };
  } catch (error) {
    console.error('❌ Error sending session summary email:', error);
    const errorMessage = error.text || error.message || 'Unknown error';
    
    // Provide specific guidance for template not found errors
    if (errorMessage.includes('template ID not found') || errorMessage.includes('Template ID not found')) {
      console.error(`❌ EmailJS Template '${SESSION_SUMMARY_TEMPLATE}' not found. Please create this template in your EmailJS dashboard.`);
    }
    
    return { success: false, error: errorMessage };
  }
};

/**
 * Send Vibro_Followup email to both client and practitioner
 * @param {Object} sessionData - Complete session data from intake form
 * @param {Object} frequencyMetadata - Frequency information from database
 * @param {string} therapistNotes - Notes from therapist
 * @returns {Promise<Object>} Email send results
 */
export const sendVibroFollowupEmails = async (sessionData, frequencyMetadata, therapistNotes = '') => {
  if (!SERVICE_ID || !PUBLIC_KEY) {
    console.warn('EmailJS not configured - skipping Vibro_Followup emails');
    return { success: false, error: 'EmailJS not configured' };
  }

  const practitionerEmail = import.meta.env.VITE_PRACTITIONER_EMAIL;
  if (!practitionerEmail) {
    console.warn('Practitioner email not configured');
    return { success: false, error: 'Practitioner email not set' };
  }

  try {
    // Ensure frequencyMetadata has required structure
    if (!frequencyMetadata || !frequencyMetadata.hz) {
      console.error('Invalid frequencyMetadata:', frequencyMetadata);
      return { success: false, error: 'Invalid frequency metadata' };
    }

    const baseTemplateParams = {
      // Session details
      session_date: sessionData.date ? new Date(sessionData.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }) : 'Not specified',
      session_time: sessionData.time || 'Not specified',

      // Frequency information
      frequency_hz: `${frequencyMetadata.hz} Hz`,
      frequency_name: frequencyMetadata.name || 'Healing Frequency',
      frequency_family: frequencyMetadata.family || 'Universal',
      healing_properties: (Array.isArray(frequencyMetadata.healingProperties) && frequencyMetadata.healingProperties.length > 0)
        ? frequencyMetadata.healingProperties.join(', ')
        : 'Balance and harmony',
      frequency_intentions: (Array.isArray(frequencyMetadata.primaryIntentions) && frequencyMetadata.primaryIntentions.length > 0)
        ? frequencyMetadata.primaryIntentions.join(', ')
        : 'Wellness',

      // Client's session intentions
      client_intentions: (Array.isArray(sessionData.intention) && sessionData.intention.length > 0)
        ? sessionData.intention.join(', ')
        : 'General wellness',
      goal_description: sessionData.goalDescription || 'Relaxation and balance',

      // Energy levels (pre-session)
      physical_energy: sessionData.physicalEnergy ? `${sessionData.physicalEnergy}/10` : 'Not rated',
      emotional_balance: sessionData.emotionalBalance ? `${sessionData.emotionalBalance}/10` : 'Not rated',
      mental_clarity: sessionData.mentalClarity ? `${sessionData.mentalClarity}/10` : 'Not rated',
      spiritual_connection: sessionData.spiritualConnection ? `${sessionData.spiritualConnection}/10` : 'Not rated',

      // Emotional indicators
      emotional_indicators: (Array.isArray(sessionData.emotionalIndicators) && sessionData.emotionalIndicators.length > 0)
        ? sessionData.emotionalIndicators.join(', ')
        : 'None',
      intuitive_messages: sessionData.intuitiveMessages || 'None shared',

      // Therapist notes
      therapist_notes: therapistNotes || 'Session completed successfully.',

      // Contact info
      reply_to: practitionerEmail
    };

    // Send to client
    const clientTemplateParams = {
      ...baseTemplateParams,
      to_name: `${sessionData.firstName || ''} ${sessionData.surname || ''}`.trim() || 'Valued Client',
      to_email: sessionData.email || ''
    };

    // Send to practitioner
    const practitionerTemplateParams = {
      ...baseTemplateParams,
      to_name: 'Practitioner',
      to_email: practitionerEmail
    };

    // Send both emails
    const [clientResult, practitionerResult] = await Promise.allSettled([
      emailjs.send(SERVICE_ID, 'Vibro_Followup', clientTemplateParams),
      emailjs.send(SERVICE_ID, 'Vibro_Followup', practitionerTemplateParams)
    ]);

    const results = {
      client: {
        success: clientResult.status === 'fulfilled',
        error: clientResult.status === 'rejected' ? clientResult.reason : null
      },
      practitioner: {
        success: practitionerResult.status === 'fulfilled',
        error: practitionerResult.status === 'rejected' ? practitionerResult.reason : null
      }
    };

    // Log results
    if (results.client.success) {
      console.log('✅ Vibro_Followup email sent to client successfully');
    } else {
      console.error('❌ Failed to send Vibro_Followup email to client:', results.client.error);
    }

    if (results.practitioner.success) {
      console.log('✅ Vibro_Followup email sent to practitioner successfully');
    } else {
      console.error('❌ Failed to send Vibro_Followup email to practitioner:', results.practitioner.error);
    }

    // Return success if at least one email was sent successfully
    const overallSuccess = results.client.success || results.practitioner.success;
    
    return {
      success: overallSuccess,
      results: results,
      message: overallSuccess ? 'Vibro_Followup emails sent successfully' : 'Failed to send Vibro_Followup emails'
    };

  } catch (error) {
    console.error('❌ Error sending Vibro_Followup emails:', error);
    const errorMessage = error.text || error.message || 'Unknown error';
    
    // Provide specific guidance for template not found errors
    if (errorMessage.includes('template ID not found') || errorMessage.includes('Template ID not found')) {
      console.error(`❌ EmailJS Template 'Vibro_Followup' not found. Please create this template in your EmailJS dashboard.`);
    }
    
    return { success: false, error: errorMessage };
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
