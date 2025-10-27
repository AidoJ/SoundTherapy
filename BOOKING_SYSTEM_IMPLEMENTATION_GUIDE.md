# 🎵 Sound Healing Market Booking System - Implementation Guide

## 📋 Overview

Complete booking system for market-based sound healing sessions with:
- Client self-service booking
- Safety screening before payment
- Dual payment methods (Stripe + Cash)
- Practitioner dashboard with session activation
- Auto-filled intake forms from booking data
- SMS/Email reminders

---

## 🗄️ Database Schema

### 1. Services Table (NEW)
Manages available services, durations, and pricing.

```sql
CREATE TABLE services (
  id UUID PRIMARY KEY,
  service_name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,  -- Store in cents (2500 = $25.00)
  currency TEXT DEFAULT 'AUD',
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  icon_emoji TEXT DEFAULT '🎵',
  max_bookings_per_slot INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default services
INSERT INTO services (service_name, description, duration_minutes, price_cents, display_order) VALUES
('Express Session', 'Quick relaxation - 15 min', 15, 2500, 1),
('Standard Session', 'Deep relaxation - 20 min', 20, 3500, 2),
('Extended Session', 'Full therapeutic - 30 min', 30, 5000, 3);
```

### 2. Bookings Table (UPDATED)
Links to services, stores safety screen data, tracks payment methods.

```sql
ALTER TABLE bookings
ADD COLUMN service_id UUID REFERENCES services(id),
ADD COLUMN price_paid_cents INTEGER,  -- Snapshot of price at booking time
ADD COLUMN contraindications JSONB DEFAULT '[]',
ADD COLUMN safety_screen_completed BOOLEAN DEFAULT false,
ADD COLUMN sms_reminder_sent_at TIMESTAMPTZ,
ADD COLUMN email_reminder_sent_at TIMESTAMPTZ,
ADD COLUMN stripe_payment_intent_id TEXT,
ADD COLUMN cash_received BOOLEAN DEFAULT false,
ADD COLUMN cash_received_at TIMESTAMPTZ,
ADD COLUMN cash_received_by TEXT;
```

**Key Fields:**
- `paymentmethod`: 'Stripe' or 'Cash'
- `paymentstatus`: 'pending' or 'paid'
- `cash_received`: true/false (only for Cash bookings)
- `safety_screen_completed`: Must be true to proceed
- `contraindications`: Empty array if "none apply"

### 3. Sessions Table (UPDATED)
Links sessions to bookings, adds new intake form fields.

```sql
ALTER TABLE sessions
ADD COLUMN booking_id UUID REFERENCES bookings(id),
ADD COLUMN practitioner_name TEXT,
ADD COLUMN pain_level INTEGER CHECK (pain_level >= 0 AND pain_level <= 10),
ADD COLUMN stress_anxiety_level INTEGER CHECK (stress_anxiety_level >= 0 AND stress_anxiety_level <= 10),
ADD COLUMN sleep_quality INTEGER CHECK (sleep_quality >= 1 AND sleep_quality <= 5),
ADD COLUMN main_pain_areas JSONB DEFAULT '[]',
ADD COLUMN pain_quality JSONB DEFAULT '[]',
ADD COLUMN pain_markers JSONB DEFAULT '[]',  -- Body map coordinates
ADD COLUMN body_view TEXT DEFAULT 'front',
ADD COLUMN contraindications JSONB DEFAULT '[]',
ADD COLUMN primary_goals JSONB DEFAULT '[]',
ADD COLUMN relevant_health_history JSONB DEFAULT '[]';

-- DROP old fields
DROP COLUMN physical_energy, emotional_balance, mental_clarity, spiritual_connection,
DROP COLUMN selected_frequencies, medications, vibration_intensity,
DROP COLUMN emotional_indicators, intuitive_messages;
```

### 4. Helpful Views

```sql
-- View for today's bookings
CREATE VIEW todays_bookings AS
SELECT
    b.*,
    s.service_name,
    s.duration_minutes,
    s.price_cents,
    CASE
        WHEN b.paymentmethod = 'Cash' AND NOT b.cash_received THEN 'Payment Due'
        WHEN b.paymentmethod = 'Cash' AND b.cash_received THEN 'Cash Received'
        WHEN b.paymentstatus = 'paid' THEN 'Paid Online'
        ELSE 'Pending'
    END as payment_display_status
FROM bookings b
LEFT JOIN services s ON b.service_id = s.id
WHERE DATE(b.selectedslot) = CURRENT_DATE
ORDER BY b.selectedslot ASC;
```

### 5. Database Functions

```sql
-- Check slot availability
CREATE FUNCTION check_slot_availability(
    p_slot_time TIMESTAMPTZ,
    p_duration_minutes INTEGER,
    p_service_id UUID
) RETURNS BOOLEAN;

-- Mark cash payment as received
CREATE FUNCTION mark_cash_received(
    p_booking_id UUID,
    p_received_by TEXT
) RETURNS VOID;
```

---

## 🔄 Complete System Flow

### Phase 1: Client Booking (market_booking_form_final.html)

**Step 1: Client Details**
- First name, surname
- Mobile phone (for SMS reminders)
- Email

**Step 2: Safety Screen** ⚠️
- Displays 10 contraindications with info tooltips:
  - Pacemakers/Implants
  - Deep Vein Thrombosis
  - Bleeding Disorders
  - Recent Surgery/Open Wounds
  - Severe Low Blood Pressure
  - Seizure Disorders
  - Acute Inflammatory Conditions
  - Psychotic Conditions
  - Pregnancy
  - Chemotherapy/Active Cancer

- **Must check "None of the above apply"** to proceed
- If ANY contraindication selected → Red error, booking blocked
- **Prevents payment for ineligible clients**

**Step 3: Select Service**
- Fetches from `services` table (not hardcoded!)
- Displays:
  - Service name (e.g., "Express Session")
  - Duration (15/20/30 minutes)
  - Price (dynamic from database)
  - Description
  - Icon emoji

**Step 4: Select Time Slot**
- Today's available slots only (market setup)
- Generated in 15-minute intervals
- Shows availability status

**Step 5: Choose Payment Method**
- **Option 1: Pay Now with Card (Stripe)**
  - Secure online payment
  - Instant confirmation
  - Booking status: `confirmed`, payment: `paid`

- **Option 2: Pay Cash at Market**
  - Reserve spot without payment
  - Pay on arrival
  - Booking status: `confirmed`, payment: `pending`
  - Cash received: `false`

**Step 6: Booking Summary**
- Review all details
- Confirm booking

**On Confirmation:**

*If Stripe:*
```javascript
// Redirect to Stripe payment
window.location.href = '/api/create-stripe-session?bookingData=...';
```

*If Cash:*
```javascript
// Save booking to database
const bookingData = {
  ...clientDetails,
  service_id: selectedService.id,
  price_paid_cents: selectedService.price_cents,
  paymentmethod: 'Cash',
  paymentstatus: 'pending',
  bookingstatus: 'confirmed',
  cash_received: false,
  safety_screen_completed: true,
  contraindications: []
};

await supabase.from('bookings').insert([bookingData]);
```

**Success Screen:**
- Shows booking confirmation
- Different instructions for Stripe vs Cash:
  - Stripe: "Payment confirmed, see you soon!"
  - Cash: "Bring $XX.XX cash when you arrive"
- SMS/Email reminder notification promise

---

### Phase 2: Practitioner Dashboard (practitioner_bookings_list_final.html)

**Dashboard Features:**

**Stats Display:**
- Total Bookings
- Confirmed (ready to start)
- Cash Pending (waiting for payment)
- Completed

**Filters:**
- All
- Ready to Start (confirmed + paid)
- Cash Payment Due
- In Progress
- Completed

**Booking Card Shows:**
- Time badge (10:00, 30 min)
- Client name, phone, email
- Service name + price
- Payment status:
  - 💳 Paid Online (Stripe)
  - 💵 Cash Due (pending)
  - 💵 Cash Received (confirmed)
- Booking status badge
- Action buttons (dynamic based on status)

**Action Buttons (Dynamic):**

1. **Cash Pending** → Show:
   ```html
   <button>💵 Mark Cash Received</button>
   ```
   - Practitioner clicks when client pays
   - Calls `mark_cash_received()` database function
   - Updates:
     - `cash_received = true`
     - `paymentstatus = 'paid'`
     - `bookingstatus = 'confirmed'`

2. **Confirmed (Ready)** → Show:
   ```html
   <button>▶️ Start Session</button>
   ```
   - Client has arrived
   - Redirects to intake form: `/intake?bookingId=xxx`
   - Updates `bookingstatus = 'in-progress'`

3. **In Progress** → Show:
   ```html
   <button>✓ Complete Session</button>
   ```
   - Session finished
   - Updates `bookingstatus = 'completed'`
   - Triggers session summary email

4. **Completed** → Show:
   ```html
   <button>View Session</button>
   ```
   - View session details only

---

### Phase 3: Intake Form (IntakeForm.jsx - TO BE UPDATED)

**On Load:**
```javascript
// Get bookingId from URL
const params = new URLSearchParams(window.location.search);
const bookingId = params.get('bookingId');

// Fetch booking data
const { data: booking } = await supabase
  .from('bookings')
  .select('*, services(*)')
  .eq('id', bookingId)
  .single();

// Auto-fill form fields
setFormData({
  // From booking
  fullName: `${booking.firstname} ${booking.surname}`,
  dateOfBirth: booking.dateofbirth,
  phone: booking.phone,
  email: booking.email,
  todaysDate: new Date().toISOString().split('T')[0],
  practitioner: 'Market Practitioner', // From logged-in user

  // Safety screen (from booking)
  contraindications: booking.contraindications, // Shows "None apply" checked

  // Practitioner completes during session:
  primaryGoals: [],
  painLevel: 0,
  stressAnxietyLevel: 0,
  sleepQuality: 1,
  mainPainAreas: [],
  painQuality: [],
  painMarkers: [],
  relevantHealthHistory: [],
  consent: false,
  therapistSignature: ''
});
```

**On Submit:**
```javascript
// Calculate frequency based on NEW fields
const frequency = await matchAudioFile({
  painLevel: formData.painLevel,
  stressAnxietyLevel: formData.stressAnxietyLevel,
  sleepQuality: formData.sleepQuality,
  primaryGoals: formData.primaryGoals,
  mainPainAreas: formData.mainPainAreas,
  relevantHealthHistory: formData.relevantHealthHistory
});

// Create session record linked to booking
await supabase.from('sessions').insert({
  booking_id: bookingId,
  client_id: booking.client_id,
  practitioner_name: formData.practitioner,
  primary_goals: formData.primaryGoals,
  pain_level: formData.painLevel,
  stress_anxiety_level: formData.stressAnxietyLevel,
  sleep_quality: formData.sleepQuality,
  main_pain_areas: formData.mainPainAreas,
  pain_quality: formData.painQuality,
  pain_markers: formData.painMarkers,
  body_view: formData.bodyView,
  contraindications: booking.contraindications,
  relevant_health_history: formData.relevantHealthHistory,
  frequency_suggested: frequency,
  consent_given: true,
  signature: formData.therapistSignature
});

// Redirect to results
navigate('/results', { state: { frequency, sessionData: formData } });
```

---

### Phase 4: Results & Completion (ResultsScreen.jsx)

**On "Complete Session":**
```javascript
// Get therapist notes and signature
const therapistData = {
  notes: therapistNotes,
  signature: therapistSignatureDataUrl
};

// Update session
await supabase
  .from('sessions')
  .update({
    therapist_notes: therapistData.notes,
    therapist_signature: therapistData.signature,
    status: 'completed',
    completed_at: new Date().toISOString()
  })
  .eq('booking_id', bookingId);

// Update booking status
await supabase
  .from('bookings')
  .update({ bookingstatus: 'completed' })
  .eq('id', bookingId);

// Send session summary email
await sendSessionSummaryEmail(sessionData, frequencyInfo, therapistNotes);

// Show success message
alert('Session completed! Summary email sent to client.');
```

---

## 🔧 Algorithm Update Required

**File:** `src/services/audioMatcher.js`

**Current Algorithm Uses:**
- `physical_energy`
- `emotional_balance`
- `mental_clarity`
- `spiritual_connection`
- `intention`
- `emotionalIndicators`

**Must Update To Use:**
```javascript
export const matchAudioFile = async (formData) => {
  const {
    painLevel,              // 0-10
    stressAnxietyLevel,     // 0-10
    sleepQuality,           // 1-5
    primaryGoals,           // Array: ['pain', 'stress', 'sleep', etc.]
    mainPainAreas,          // Array: ['Neck', 'Lower back', etc.]
    painQuality,            // Array: ['Achy', 'Sharp', etc.]
    relevantHealthHistory   // Array: ['Fibromyalgia', 'Chronic pain', etc.]
  } = formData;

  // NEW LOGIC:
  let score = 0;

  // High pain + chronic conditions → Grounding frequencies (174 Hz)
  if (painLevel >= 7 || relevantHealthHistory.includes('Fibromyalgia')) {
    return 174;
  }

  // High stress/anxiety → Liberation frequencies (396 Hz)
  if (stressAnxietyLevel >= 7 || primaryGoals.includes('stress')) {
    return 396;
  }

  // Sleep issues → Solfeggio healing (528 Hz)
  if (sleepQuality <= 2 || primaryGoals.includes('sleep')) {
    return 528;
  }

  // Movement/mobility issues → Expression (741 Hz)
  if (primaryGoals.includes('movement') || relevantHealthHistory.includes('Parkinsons')) {
    return 741;
  }

  // General relaxation → Default (432 Hz)
  return 432;
};
```

---

## 💳 Payment Integration

### Stripe Setup

**1. Install Stripe:**
```bash
npm install @stripe/stripe-js
```

**2. Create Payment Intent Endpoint:**
```javascript
// /api/create-stripe-session

import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  const { bookingData } = req.body;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'aud',
        product_data: {
          name: bookingData.selectedService.service_name,
          description: `${bookingData.selectedService.duration_minutes} minute session`
        },
        unit_amount: bookingData.selectedService.price_cents
      },
      quantity: 1
    }],
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_URL}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/booking`,
    metadata: {
      bookingData: JSON.stringify(bookingData)
    }
  });

  res.json({ sessionId: session.id });
}
```

**3. Success Webhook:**
```javascript
// /api/stripe-webhook

export default async function handler(req, res) {
  const sig = req.headers['stripe-signature'];
  const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const bookingData = JSON.parse(session.metadata.bookingData);

    // Save booking to database
    await supabase.from('bookings').insert({
      ...bookingData,
      paymentmethod: 'Stripe',
      paymentstatus: 'paid',
      bookingstatus: 'confirmed',
      stripe_payment_intent_id: session.payment_intent
    });

    // Send confirmation email
    // Send SMS reminder
  }

  res.json({ received: true });
}
```

---

## 📱 SMS Reminders (Future)

**Options:**
1. **Twilio** - Most popular
2. **AWS SNS** - If already using AWS
3. **MessageBird** - Good for Australia

**Implementation:**
```javascript
// Schedule reminder job (run every minute)
const sendReminders = async () => {
  // Find bookings due in 15 minutes
  const { data: bookings } = await supabase
    .from('bookings')
    .select('*')
    .is('sms_reminder_sent_at', null)
    .gte('selectedslot', new Date(Date.now() + 14 * 60 * 1000))
    .lte('selectedslot', new Date(Date.now() + 16 * 60 * 1000));

  for (const booking of bookings) {
    await twilioClient.messages.create({
      body: `Reminder: Your sound healing session is in 15 minutes at ${booking.time}. See you soon!`,
      to: booking.phone,
      from: process.env.TWILIO_PHONE
    });

    await supabase
      .from('bookings')
      .update({ sms_reminder_sent_at: new Date() })
      .eq('id', booking.id);
  }
};
```

---

## ✅ Implementation Checklist

### Database
- [ ] Run `complete_schema_update.sql` in Supabase
- [ ] Verify `services` table created with default services
- [ ] Verify `bookings` table updated with new columns
- [ ] Verify `sessions` table updated with new columns
- [ ] Test `todays_bookings` view
- [ ] Test `mark_cash_received()` function

### Frontend Components
- [ ] Convert `market_booking_form_final.html` to React component
- [ ] Update `IntakeForm.jsx` to accept `bookingId` prop
- [ ] Update `IntakeForm.jsx` to auto-fill from booking data
- [ ] Update `ResultsScreen.jsx` to link session to booking
- [ ] Convert `practitioner_bookings_list_final.html` to React component

### Algorithm
- [ ] Update `audioMatcher.js` to use new fields:
  - pain_level
  - stress_anxiety_level
  - sleep_quality
  - primary_goals
  - relevant_health_history

### Payment Integration
- [ ] Set up Stripe account
- [ ] Add Stripe keys to environment variables
- [ ] Create `/api/create-stripe-session` endpoint
- [ ] Create `/api/stripe-webhook` endpoint
- [ ] Test Stripe payment flow
- [ ] Test Cash payment flow

### Admin Features
- [ ] Create services management panel (add/edit/disable services)
- [ ] Add pricing adjustment UI
- [ ] Add booking calendar view
- [ ] Add reports dashboard (revenue, bookings by service, etc.)

### Testing
- [ ] Test complete booking flow (Stripe)
- [ ] Test complete booking flow (Cash)
- [ ] Test safety screen blocking
- [ ] Test practitioner marking cash received
- [ ] Test session activation from booking
- [ ] Test auto-fill of intake form
- [ ] Test session completion and email
- [ ] Test with multiple concurrent bookings

### Future Enhancements
- [ ] SMS reminders integration
- [ ] Email reminder automation
- [ ] Online booking widget for website
- [ ] Client booking history/account
- [ ] Loyalty program integration
- [ ] Multi-location support
- [ ] Package deals (3-session pass, etc.)
- [ ] Gift certificates
- [ ] Waitlist functionality

---

## 🎯 Key Advantages of This System

1. **No Hardcoded Prices** - All pricing in database, easy to update
2. **Safety First** - Blocks ineligible clients BEFORE payment
3. **Flexible Payment** - Supports both online and cash for market scenarios
4. **Linked Data** - Booking → Session relationship maintains data integrity
5. **Auto-Fill** - Reduces data entry errors
6. **Scalable** - Easy to add services, locations, practitioners
7. **Professional** - Clean UI, clear workflow

---

## 📞 Support

For questions or issues, check:
- Database schema: `complete_schema_update.sql`
- Booking form mockup: `market_booking_form_final.html`
- Practitioner view mockup: `practitioner_bookings_list_final.html`
- This implementation guide

---

**System Ready for Implementation! 🚀**
