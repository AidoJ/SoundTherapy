-- Add payment tracking columns to bookings table
-- Run this in your Supabase SQL editor
--
-- NOTE: The bookings table already has these columns:
--   - paymentmethod (TEXT)
--   - paymentstatus (TEXT)
--   - price_paid_cents (INTEGER)
--   - cash_received (BOOLEAN)
--
-- We only need to add the Stripe payment intent ID column:

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

-- Add comments for documentation
COMMENT ON COLUMN bookings.paymentmethod IS 'Payment method: Stripe, Cash, or null for unpaid';
COMMENT ON COLUMN bookings.paymentstatus IS 'Payment status: pending, paid, failed, refunded';
COMMENT ON COLUMN bookings.price_paid_cents IS 'Amount paid in cents (matches Stripe format)';
COMMENT ON COLUMN bookings.stripe_payment_intent_id IS 'Stripe Payment Intent ID for card payments';
COMMENT ON COLUMN bookings.cash_received IS 'True if cash payment was received at booking time';

-- Create index for payment queries
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(paymentstatus);
CREATE INDEX IF NOT EXISTS idx_bookings_stripe_intent ON bookings(stripe_payment_intent_id);
