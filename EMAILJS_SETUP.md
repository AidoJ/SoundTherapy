# EmailJS Setup Guide

## Issue Fixed
The email errors you were seeing were caused by missing EmailJS template IDs. The application was trying to use templates that don't exist in your EmailJS dashboard.

## Current Email Flow
When the **Complete Session** button is clicked, the app now sends the `Vibro_Followup` template to:
1. **Client's email** (from the intake form)
2. **Practitioner's email** (from `VITE_PRACTITIONER_EMAIL` environment variable)

## Required Setup

### 1. Create EmailJS Template

You need to create **ONE** template in your EmailJS dashboard at https://dashboard.emailjs.com/admin/templates:

#### Template: `Vibro_Followup`
- **Template ID**: `Vibro_Followup` (exactly this name)
- **Subject**: Your Sound Healing Session Summary
- **Content**: Use the HTML template from `email-template.html` in your project root

### 2. Environment Variables

Your Netlify deployment already has these environment variables configured:
- `VITE_EMAILJS_SERVICE_ID`
- `VITE_EMAILJS_PUBLIC_KEY` 
- `VITE_PRACTITIONER_EMAIL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ADMIN_PASSWORD`
- `EMAILJS_PRIVATE_KEY`

### 3. Template Variables

The `Vibro_Followup` template should use these variables (already included in `email-template.html`):
- `{{to_name}}` - Recipient's name (Client's name or "Practitioner")
- `{{to_email}}` - Recipient's email
- `{{session_date}}` - Formatted session date
- `{{session_time}}` - Session time
- `{{frequency_hz}}` - Frequency in Hz (e.g., "143 Hz")
- `{{frequency_name}}` - Frequency name
- `{{frequency_family}}` - Frequency family
- `{{healing_properties}}` - Healing properties
- `{{frequency_intentions}}` - Primary intentions
- `{{client_intentions}}` - Client's session intentions
- `{{goal_description}}` - Session goal
- `{{physical_energy}}` - Physical energy rating
- `{{emotional_balance}}` - Emotional balance rating
- `{{mental_clarity}}` - Mental clarity rating
- `{{spiritual_connection}}` - Spiritual connection rating
- `{{emotional_indicators}}` - Emotional themes
- `{{intuitive_messages}}` - Intuitive messages
- `{{therapist_notes}}` - Therapist notes
- `{{reply_to}}` - Practitioner email

## Changes Made

1. **Simplified email flow** - Only one template (`Vibro_Followup`) is needed
2. **Dual email sending** - Sends to both client and practitioner when Complete Session is clicked
3. **Improved error handling** with specific guidance for missing templates
4. **Better user feedback** - Shows which emails were sent successfully

## How It Works

1. Client fills out the intake form
2. App processes the form and shows results screen
3. When **Complete Session** button is clicked:
   - Sends `Vibro_Followup` template to client's email (from form)
   - Sends `Vibro_Followup` template to practitioner's email (from environment variable)
   - Shows success/failure message for each email

## Testing

After creating the `Vibro_Followup` template in your EmailJS dashboard:

1. Deploy your app (your environment variables are already set in Netlify)
2. Fill out a test session form
3. Click "Complete Session" button
4. Check that both emails are sent successfully

The app will show clear feedback about which emails were sent successfully.
