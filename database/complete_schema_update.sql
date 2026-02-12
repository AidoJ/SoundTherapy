-- COMPLETE DATABASE SCHEMA UPDATE
-- Sound Healing Market Booking System
-- Run this in your Supabase SQL Editor

-- =====================================================
-- 1. CREATE SERVICES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_name TEXT NOT NULL,
  service_type TEXT DEFAULT 'sound_healing',
  description TEXT,
  duration_minutes INTEGER NOT NULL,
  price_cents INTEGER NOT NULL, -- Store in cents to avoid floating point issues
  currency TEXT DEFAULT 'AUD',
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  color_hex TEXT DEFAULT '#008e8c',
  icon_emoji TEXT DEFAULT '🎵',
  max_bookings_per_slot INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT services_duration_check CHECK (duration_minutes > 0),
  CONSTRAINT services_price_check CHECK (price_cents >= 0)
);

-- Create indexes for services
CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active);
CREATE INDEX IF NOT EXISTS idx_services_display_order ON services(display_order);
CREATE INDEX IF NOT EXISTS idx_services_type ON services(service_type);

-- Insert default market services
INSERT INTO services (service_name, service_type, description, duration_minutes, price_cents, display_order, is_active) VALUES
('Express Session', 'sound_healing', 'Quick relaxation and stress relief - perfect for a market visit', 15, 2500, 1, true),
('Standard Session', 'sound_healing', 'Deep relaxation and pain management', 20, 3500, 2, true),
('Extended Session', 'sound_healing', 'Full therapeutic experience with comprehensive healing', 30, 5000, 3, true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 2. UPDATE BOOKINGS TABLE
-- =====================================================

-- Add new columns to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES services(id),
ADD COLUMN IF NOT EXISTS price_paid_cents INTEGER,
ADD COLUMN IF NOT EXISTS contraindications JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS safety_screen_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sms_reminder_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS email_reminder_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reminder_minutes_before INTEGER DEFAULT 15,
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS cash_received BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cash_received_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cash_received_by TEXT;

-- Update payment method constraint to include 'Cash'
-- Note: This assumes paymentmethod column exists. If it's paymentMethod (camelCase), adjust accordingly

-- Add index for quick lookups
CREATE INDEX IF NOT EXISTS idx_bookings_service_id ON bookings(service_id);
CREATE INDEX IF NOT EXISTS idx_bookings_safety_screen ON bookings(safety_screen_completed);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_method ON bookings(paymentmethod);

-- =====================================================
-- 3. UPDATE SESSIONS TABLE
-- =====================================================

-- Add booking reference
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id);

-- Add new intake form fields
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS practitioner_name TEXT,
ADD COLUMN IF NOT EXISTS pain_level INTEGER CHECK (pain_level >= 0 AND pain_level <= 10),
ADD COLUMN IF NOT EXISTS stress_anxiety_level INTEGER CHECK (stress_anxiety_level >= 0 AND stress_anxiety_level <= 10),
ADD COLUMN IF NOT EXISTS sleep_quality INTEGER CHECK (sleep_quality >= 1 AND sleep_quality <= 5),
ADD COLUMN IF NOT EXISTS main_pain_areas JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS pain_quality JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS pain_markers JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS body_view TEXT DEFAULT 'front',
ADD COLUMN IF NOT EXISTS contraindications JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS primary_goals JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS relevant_health_history JSONB DEFAULT '[]'::jsonb;

-- Create index for booking lookups
CREATE INDEX IF NOT EXISTS idx_sessions_booking_id ON sessions(booking_id);

-- =====================================================
-- 4. DROP DEPRECATED COLUMNS FROM SESSIONS
-- =====================================================
-- Only run these if you're sure no existing data needs to be migrated
-- Comment out if you need to migrate data first

-- ALTER TABLE sessions
-- DROP COLUMN IF EXISTS physical_energy,
-- DROP COLUMN IF EXISTS emotional_balance,
-- DROP COLUMN IF EXISTS mental_clarity,
-- DROP COLUMN IF EXISTS spiritual_connection,
-- DROP COLUMN IF EXISTS selected_frequencies,
-- DROP COLUMN IF EXISTS medications,
-- DROP COLUMN IF EXISTS vibration_intensity,
-- DROP COLUMN IF EXISTS emotional_indicators,
-- DROP COLUMN IF EXISTS intuitive_messages;

-- =====================================================
-- 5. CREATE HELPFUL VIEWS
-- =====================================================

-- View for today's bookings with service details
CREATE OR REPLACE VIEW todays_bookings AS
SELECT
    b.id,
    b.firstname,
    b.surname,
    b.firstname || ' ' || b.surname as full_name,
    b.phone,
    b.email,
    b.selectedslot,
    TO_CHAR(b.selectedslot, 'HH24:MI') as booking_time,
    b.paymentmethod,
    b.paymentstatus,
    b.bookingstatus,
    b.notes,
    b.safety_screen_completed,
    b.cash_received,
    s.service_name,
    s.duration_minutes,
    s.price_cents,
    (s.price_cents::FLOAT / 100) as price_dollars,
    s.icon_emoji,
    b.createdat,
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

-- View for available service offerings
CREATE OR REPLACE VIEW active_services AS
SELECT
    id,
    service_name,
    service_type,
    description,
    duration_minutes,
    price_cents,
    (price_cents::FLOAT / 100) as price_dollars,
    currency,
    display_order,
    color_hex,
    icon_emoji
FROM services
WHERE is_active = true
ORDER BY display_order ASC;

-- =====================================================
-- 6. CREATE FUNCTIONS
-- =====================================================

-- Function to check slot availability
CREATE OR REPLACE FUNCTION check_slot_availability(
    p_slot_time TIMESTAMPTZ,
    p_duration_minutes INTEGER,
    p_service_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_max_bookings INTEGER;
    v_current_bookings INTEGER;
BEGIN
    -- Get max bookings allowed for this service
    SELECT max_bookings_per_slot INTO v_max_bookings
    FROM services
    WHERE id = p_service_id;

    -- Count current bookings for this slot (not cancelled)
    SELECT COUNT(*) INTO v_current_bookings
    FROM bookings
    WHERE selectedslot = p_slot_time
    AND service_id = p_service_id
    AND bookingstatus != 'cancelled'
    AND DATE(selectedslot) = DATE(p_slot_time);

    -- Return true if slot is available
    RETURN v_current_bookings < v_max_bookings;
END;
$$ LANGUAGE plpgsql;

-- Function to mark cash payment as received
CREATE OR REPLACE FUNCTION mark_cash_received(
    p_booking_id UUID,
    p_received_by TEXT
)
RETURNS VOID AS $$
BEGIN
    UPDATE bookings
    SET
        cash_received = true,
        cash_received_at = NOW(),
        cash_received_by = p_received_by,
        paymentstatus = 'paid',
        bookingstatus = 'confirmed'
    WHERE id = p_booking_id
    AND paymentmethod = 'Cash';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE services IS 'Available service types, durations, and pricing';
COMMENT ON COLUMN bookings.service_id IS 'Links to the service that was booked';
COMMENT ON COLUMN bookings.price_paid_cents IS 'Snapshot of price at time of booking (in cents)';
COMMENT ON COLUMN bookings.contraindications IS 'Safety screen responses from booking form';
COMMENT ON COLUMN bookings.safety_screen_completed IS 'Whether client passed safety screen';
COMMENT ON COLUMN bookings.cash_received IS 'Whether cash payment has been received (for Cash payment method)';
COMMENT ON COLUMN bookings.stripe_payment_intent_id IS 'Stripe payment intent ID for online payments';
COMMENT ON COLUMN sessions.booking_id IS 'Links session to the original booking';
COMMENT ON COLUMN sessions.pain_level IS 'Pain level 0-10 from intake form';
COMMENT ON COLUMN sessions.stress_anxiety_level IS 'Stress/anxiety level 0-10 from intake form';
COMMENT ON COLUMN sessions.sleep_quality IS 'Sleep quality 1-5 from intake form';
COMMENT ON COLUMN sessions.primary_goals IS 'Client goals selected in intake form';
COMMENT ON COLUMN sessions.relevant_health_history IS 'Health conditions relevant to session';

-- =====================================================
-- 8. SAMPLE DATA FOR TESTING (Optional)
-- =====================================================

-- Uncomment to insert sample bookings for testing
/*
INSERT INTO bookings (
    userid, firstname, surname, phone, email,
    service_id, selectedslot, duration,
    paymentmethod, paymentstatus, bookingstatus,
    price_paid_cents, safety_screen_completed,
    contraindications
) VALUES
(
    'test_user_1',
    'Sarah',
    'Johnson',
    '0412345678',
    'sarah.j@email.com',
    (SELECT id FROM services WHERE service_name = 'Standard Session' LIMIT 1),
    (CURRENT_DATE + TIME '14:00'),
    20,
    'Stripe',
    'paid',
    'confirmed',
    3500,
    true,
    '[]'::jsonb
),
(
    'test_user_2',
    'Michael',
    'Chen',
    '0433987654',
    'm.chen@email.com',
    (SELECT id FROM services WHERE service_name = 'Express Session' LIMIT 1),
    (CURRENT_DATE + TIME '15:00'),
    15,
    'Cash',
    'pending',
    'pending',
    2500,
    true,
    '[]'::jsonb
);
*/

-- =====================================================
-- 9. GRANT PERMISSIONS (Adjust as needed)
-- =====================================================

-- Grant select on views
GRANT SELECT ON todays_bookings TO authenticated;
GRANT SELECT ON active_services TO anon, authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

SELECT 'Schema update completed successfully!' as status;
