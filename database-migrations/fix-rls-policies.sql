-- Fix Row Level Security (RLS) Policies for Admin Panel Access
-- Run this in your Supabase SQL editor if tables are not showing data

-- This disables RLS for development (allows all reads/writes)
-- In production, you should create proper RLS policies with authentication

-- Check if RLS is enabled (run this first to diagnose):
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('clients', 'sessions', 'frequencies', 'audio_files', 'bookings', 'services');

-- If rowsecurity = true, RLS is blocking your queries
-- Option 1: Disable RLS for development (EASIEST - use this for now)
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE frequencies DISABLE ROW LEVEL SECURITY;
ALTER TABLE audio_files DISABLE ROW LEVEL SECURITY;
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE services DISABLE ROW LEVEL SECURITY;

-- Option 2: Enable public access with policies (MORE SECURE for production)
-- Uncomment these if you want RLS enabled with permissive policies:

/*
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE frequencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Create permissive policies (allows all operations for now)
CREATE POLICY "Allow all on clients" ON clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on sessions" ON sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on frequencies" ON frequencies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on audio_files" ON audio_files FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on bookings" ON bookings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on services" ON services FOR ALL USING (true) WITH CHECK (true);
*/

-- Verify changes (should show rowsecurity = false)
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('clients', 'sessions', 'frequencies', 'audio_files', 'bookings', 'services');
