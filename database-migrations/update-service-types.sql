-- Update service_type values to user-friendly names
-- Run this in your Supabase SQL editor

-- Update existing services to use proper names
UPDATE services
SET service_type = 'Vibro Acoustic Therapy'
WHERE service_type = 'sound_healing' OR service_type IS NULL;

-- Check current services
SELECT service_type, service_name, price_cents/100.0 as price_aud, is_active
FROM services
ORDER BY service_type, display_order;

-- Optional: Add sample PEMF services if you don't have any yet
-- (Comment out if you already have PEMF services)
INSERT INTO services (service_name, service_type, description, duration_minutes, price_cents, icon_emoji, is_active, display_order) VALUES
  ('PEMF Quick Session', 'PEMF Therapy', 'Brief PEMF therapy for energy boost', 15, 4000, '⚡', true, 10),
  ('PEMF Standard Session', 'PEMF Therapy', 'Standard PEMF therapy session', 20, 5500, '🔋', true, 11),
  ('PEMF Deep Session', 'PEMF Therapy', 'Extended PEMF therapy for deep healing', 30, 8000, '✨', true, 12)
ON CONFLICT (id) DO NOTHING;

-- Verify the update
SELECT service_type, COUNT(*) as service_count
FROM services
WHERE is_active = true
GROUP BY service_type;
