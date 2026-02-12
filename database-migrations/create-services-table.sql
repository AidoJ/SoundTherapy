-- Create services table for flexible pricing and durations
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,
  icon_emoji TEXT DEFAULT '🎵',
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE services IS 'Available vibroacoustic therapy services with pricing and durations';
COMMENT ON COLUMN services.service_name IS 'Display name of the service';
COMMENT ON COLUMN services.description IS 'Service description shown to customers';
COMMENT ON COLUMN services.duration_minutes IS 'Session duration in minutes (15, 20, 30, etc.)';
COMMENT ON COLUMN services.price_cents IS 'Price in cents (e.g., 5000 = $50.00) - Stripe format';
COMMENT ON COLUMN services.icon_emoji IS 'Emoji icon for display (e.g., 🎵, 🧘, ✨)';
COMMENT ON COLUMN services.is_active IS 'Whether this service is currently bookable';
COMMENT ON COLUMN services.display_order IS 'Order to display services (lower numbers first)';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active);
CREATE INDEX IF NOT EXISTS idx_services_display_order ON services(display_order);

-- Insert default services (example data - adjust prices as needed)
INSERT INTO services (service_name, description, duration_minutes, price_cents, icon_emoji, is_active, display_order) VALUES
  ('Quick Relaxation Session', 'Perfect for a quick reset and stress relief', 15, 3500, '⚡', true, 1),
  ('Standard Healing Session', 'Balanced session for general wellness and pain relief', 20, 5000, '🎵', true, 2),
  ('Deep Healing Session', 'Extended session for deeper healing and transformation', 30, 7500, '✨', true, 3)
ON CONFLICT DO NOTHING;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_services_updated_at
BEFORE UPDATE ON services
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
