-- Bookings Table Schema for Sound Healing App
-- Run this SQL in your Supabase SQL Editor

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    userID VARCHAR(255) NOT NULL,
    firstName VARCHAR(100) NOT NULL,
    surname VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    serviceType VARCHAR(100) DEFAULT 'Sound Healing Session',
    duration INTEGER NOT NULL DEFAULT 30, -- in minutes
    selectedSlot TIMESTAMPTZ NOT NULL,
    paymentMethod VARCHAR(50) DEFAULT 'Stripe',
    paymentStatus VARCHAR(20) DEFAULT 'pending', -- pending, paid, failed, refunded
    bookingStatus VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, in_progress, completed, cancelled
    notes TEXT,
    createdAt TIMESTAMPTZ DEFAULT NOW(),
    updatedAt TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_userID ON bookings(userID);
CREATE INDEX IF NOT EXISTS idx_bookings_selectedSlot ON bookings(selectedSlot);
CREATE INDEX IF NOT EXISTS idx_bookings_bookingStatus ON bookings(bookingStatus);
CREATE INDEX IF NOT EXISTS idx_bookings_paymentStatus ON bookings(paymentStatus);
CREATE INDEX IF NOT EXISTS idx_bookings_email ON bookings(email);

-- Create a function to automatically update the updatedAt timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updatedAt = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updatedAt
CREATE TRIGGER update_bookings_updated_at 
    BEFORE UPDATE ON bookings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for testing
INSERT INTO bookings (userID, firstName, surname, phone, email, serviceType, duration, selectedSlot, paymentMethod, paymentStatus, bookingStatus, notes) VALUES
('user_001', 'Sarah', 'Johnson', '0412 345 678', 'sarah.j@email.com', 'Sound Healing Session', 30, '2024-01-15 10:00:00+00', 'Stripe', 'paid', 'confirmed', 'First time client, interested in stress relief'),
('user_002', 'Michael', 'Chen', '0433 987 654', 'm.chen@email.com', 'Sound Healing Session', 45, '2024-01-15 11:00:00+00', 'Stripe', 'paid', 'pending', 'Returning client, prefers longer sessions'),
('user_003', 'Emma', 'Williams', '0422 111 222', 'emma.w@email.com', 'Sound Healing Session', 30, '2024-01-15 14:00:00+00', 'Stripe', 'paid', 'in_progress', 'Currently in session'),
('user_004', 'David', 'Brown', '0444 555 666', 'david.b@email.com', 'Sound Healing Session', 30, '2024-01-15 15:30:00+00', 'Stripe', 'paid', 'confirmed', 'New client, anxiety management'),
('user_005', 'Lisa', 'Garcia', '0455 777 888', 'lisa.g@email.com', 'Sound Healing Session', 45, '2024-01-15 16:00:00+00', 'Stripe', 'pending', 'pending', 'Chronic pain management');

-- Create a view for easy booking management
CREATE OR REPLACE VIEW booking_summary AS
SELECT 
    id,
    userID,
    firstName || ' ' || surname as fullName,
    phone,
    email,
    serviceType,
    duration,
    selectedSlot,
    paymentMethod,
    paymentStatus,
    bookingStatus,
    notes,
    createdAt,
    updatedAt,
    EXTRACT(HOUR FROM selectedSlot) as hour,
    EXTRACT(MINUTE FROM selectedSlot) as minute,
    TO_CHAR(selectedSlot, 'YYYY-MM-DD') as bookingDate,
    TO_CHAR(selectedSlot, 'HH24:MI') as bookingTime
FROM bookings
ORDER BY selectedSlot ASC;

-- Grant permissions (adjust as needed for your setup)
-- ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Example RLS policies (uncomment and modify as needed)
-- CREATE POLICY "Enable read access for authenticated users" ON bookings
--     FOR SELECT USING (auth.role() = 'authenticated');

-- CREATE POLICY "Enable insert for authenticated users" ON bookings
--     FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- CREATE POLICY "Enable update for authenticated users" ON bookings
--     FOR UPDATE USING (auth.role() = 'authenticated');

-- CREATE POLICY "Enable delete for authenticated users" ON bookings
--     FOR DELETE USING (auth.role() = 'authenticated');
