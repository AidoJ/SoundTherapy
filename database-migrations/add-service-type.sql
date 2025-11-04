-- Add service_type column to services table
-- Run this in your Supabase SQL editor

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS service_type TEXT DEFAULT 'Vibro Acoustic Therapy';

-- Add comment
COMMENT ON COLUMN services.service_type IS 'Type of service: Vibro Acoustic Therapy, PEMF Therapy, etc.';

-- Create index for filtering by service type
CREATE INDEX IF NOT EXISTS idx_services_type ON services(service_type);

-- Update existing services to have a type (if you have any)
UPDATE services
SET service_type = 'Vibro Acoustic Therapy'
WHERE service_type IS NULL;

-- Add some sample PEMF services (optional - remove if not needed)
INSERT INTO services (service_name, description, duration_minutes, price_cents, icon_emoji, is_active, display_order, service_type) VALUES
  ('PEMF Quick Session', 'Brief PEMF therapy for energy boost', 15, 4000, '⚡', true, 10, 'PEMF Therapy'),
  ('PEMF Standard Session', 'Standard PEMF therapy session', 20, 5500, '🔋', true, 11, 'PEMF Therapy'),
  ('PEMF Deep Session', 'Extended PEMF therapy for deep healing', 30, 8000, '✨', true, 12, 'PEMF Therapy')
ON CONFLICT DO NOTHING;

-- Verify changes
SELECT service_type, service_name, price_cents/100.0 as price_aud
FROM services
ORDER BY service_type, display_order;
