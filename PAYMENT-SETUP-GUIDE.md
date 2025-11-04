# 💳 Payment Integration Setup Guide

## ✅ Implementation Complete!

Your booking form now supports:
- 💳 **Stripe card payments** (real-time processing)
- 💵 **Cash payment tracking** (amount confirmation at booking time)
- 📊 **Flexible pricing** (managed in database, no code changes needed)

---

## 🗄️ Step 1: Database Setup

### Run these SQL scripts in Supabase SQL Editor:

#### 1. Create Services Table
```sql
-- Copy and paste from: database-migrations/create-services-table.sql
```

This creates your services table with sample pricing:
- 15 min - $35.00 AUD
- 20 min - $50.00 AUD
- 30 min - $75.00 AUD

**⚠️ UPDATE THESE PRICES TO MATCH YOUR ACTUAL PRICING!**

#### 2. Add Payment Columns
```sql
-- Copy and paste from: database-migrations/add-payment-columns.sql
```

This adds the `stripe_payment_intent_id` column to your bookings table.

---

## 🔑 Step 2: Stripe Setup

### Get Your Stripe Test Keys:
1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy your **Publishable key** (starts with `pk_test_`)
3. Copy your **Secret key** (starts with `sk_test_`)

### Add to Netlify Environment Variables:
1. Go to Netlify Dashboard → Your Site → Site Settings → Environment Variables
2. Add these variables:

```
VITE_STRIPE_PUBLISHABLE_KEY = pk_test_51...your_key_here
STRIPE_SECRET_KEY = sk_test_51...your_key_here
```

**IMPORTANT:**
- `VITE_STRIPE_PUBLISHABLE_KEY` has the `VITE_` prefix (accessible to browser)
- `STRIPE_SECRET_KEY` has NO prefix (server-side only, secure)

---

## 🧪 Step 3: Testing

### Test Card Numbers (Stripe Test Mode):

| Card Number | Result |
|-------------|--------|
| 4242 4242 4242 4242 | ✅ Success |
| 4000 0000 0000 0002 | ❌ Card Declined |
| 4000 0025 0000 3155 | 🔐 Requires Authentication |

**For all test cards:**
- Expiry: Any future date (e.g., 12/25)
- CVC: Any 3 digits (e.g., 123)
- Postal Code: Any 5 digits (e.g., 12345)

---

## 🎯 How It Works

### Booking Flow:

```
┌─────────────────────────────────────────────────┐
│ 1. Client Details                               │
│ 2. Safety Screen                                │
│ 3. Select Service (price pulled from database)  │
│ 4. Select Date & Time                           │
│ 5. PAYMENT ← NEW STEP                           │
│    ├─ Card: Stripe payment form                 │
│    │   ├─ Enter card details                    │
│    │   ├─ Pay button                            │
│    │   └─ ✅ Payment confirmed                  │
│    │                                             │
│    └─ Cash: Amount entry                        │
│        ├─ Enter amount received                 │
│        ├─ Confirm checkbox                      │
│        └─ ✅ Cash confirmed                     │
│                                                  │
│ 6. Summary & Confirm                            │
│    Shows: Payment ✅ Paid                       │
└─────────────────────────────────────────────────┘
```

### Card Payment Flow:
1. Customer chooses "Pay with Card"
2. Stripe payment form loads
3. Customer enters card details
4. Click "Pay $XX.XX Now"
5. Stripe processes payment
6. On success:
   - `payment_status = 'paid'`
   - `stripe_payment_intent_id` stored
   - Auto-advance to summary
7. Create booking in database

### Cash Payment Flow:
1. Customer/Practitioner chooses "Pay with Cash"
2. Enter amount received (must be >= service price)
3. Check "I confirm cash payment has been received"
4. Click "Complete Cash Payment"
5. On confirm:
   - `payment_status = 'paid'`
   - `cash_received = true`
   - `amount_paid_cents` = amount entered
   - Auto-advance to summary
6. Create booking in database

---

## 📊 Database Schema

### Services Table:
```
services:
  - id (uuid)
  - service_name (text) - "Standard Healing Session"
  - duration_minutes (integer) - 20
  - price_cents (integer) - 5000 (= $50.00)
  - description (text)
  - icon_emoji (text) - "🎵"
  - is_active (boolean) - true
  - display_order (integer) - 1
```

### Bookings Table (Payment Columns):
```
bookings:
  - paymentmethod (text) - "Stripe" or "Cash"
  - paymentstatus (text) - "paid"
  - price_paid_cents (integer) - 5000
  - stripe_payment_intent_id (text) - "pi_3xyz..." or null
  - cash_received (boolean) - true/false
```

---

## 🔧 Managing Pricing

### To Update Service Prices:

**Option 1: Supabase Dashboard**
1. Go to Supabase → Table Editor → services
2. Edit price_cents column
3. Example: $60.00 = 6000 cents

**Option 2: SQL**
```sql
UPDATE services
SET price_cents = 6000  -- $60.00
WHERE service_name = 'Standard Healing Session';
```

### To Add New Service:
```sql
INSERT INTO services (service_name, description, duration_minutes, price_cents, icon_emoji, display_order)
VALUES ('Extended Session', 'Deep healing experience', 45, 9500, '✨', 4);
```

**No code changes needed!** The booking form reads prices from the database.

---

## 🚀 Going Live (Production)

### When ready for real payments:

1. **Get Stripe Live Keys:**
   - Go to https://dashboard.stripe.com/apikeys (remove /test/)
   - Copy live keys (start with `pk_live_` and `sk_live_`)

2. **Update Netlify Variables:**
   ```
   VITE_STRIPE_PUBLISHABLE_KEY = pk_live_...
   STRIPE_SECRET_KEY = sk_live_...
   ```

3. **Activate Stripe Account:**
   - Complete Stripe account verification
   - Add business details
   - Connect bank account for payouts

4. **Test in Production:**
   - Use real card for small test payment
   - Verify payment appears in Stripe Dashboard
   - Refund test payment

---

## 🔍 Monitoring Payments

### Stripe Dashboard:
- View all payments: https://dashboard.stripe.com/payments
- Failed payments: https://dashboard.stripe.com/payments?status[]=failed
- Customer details: https://dashboard.stripe.com/customers

### Supabase:
```sql
-- View all paid bookings
SELECT firstname, surname, service_id, paymentmethod, price_paid_cents, stripe_payment_intent_id
FROM bookings
WHERE paymentstatus = 'paid';

-- Cash bookings only
SELECT * FROM bookings WHERE cash_received = true;

-- Card bookings only
SELECT * FROM bookings WHERE paymentmethod = 'Stripe';
```

---

## ⚠️ Troubleshooting

### "Payment intent creation failed"
- Check STRIPE_SECRET_KEY is set in Netlify
- Verify key starts with `sk_test_` (test) or `sk_live_` (production)
- Check Netlify function logs

### "The recipients address is empty" (old issue - now fixed)
- This was for email sending, not payment
- Should no longer occur

### Card payment not processing
- Check browser console for errors
- Verify VITE_STRIPE_PUBLISHABLE_KEY is set
- Try test card: 4242 4242 4242 4242
- Check Stripe Dashboard → Logs for errors

### Cash payment not saving
- Verify amount >= service price
- Confirm checkbox must be checked
- Check browser console for errors

---

## 📱 User Experience

### Customer sees:
1. Service selection with clear prices
2. Payment step with two options (card/cash)
3. For card: Secure Stripe payment form
4. For cash: Amount entry + confirmation
5. Summary showing "Payment ✅ Paid"
6. Success page with booking details

### Practitioner sees (Supabase):
- All booking details
- Payment method (Stripe/Cash)
- Amount paid
- Stripe payment ID (for card payments)
- Cash confirmation flag

---

## 💡 Benefits

✅ **No Hardcoded Prices** - All pricing in database
✅ **Secure Card Processing** - Stripe handles sensitive data
✅ **Cash Tracking** - Amount confirmed before booking
✅ **Prevents No-Shows** - Payment required upfront
✅ **Guaranteed Slots** - Only paid bookings created
✅ **Easy Updates** - Change prices without code deployment
✅ **Audit Trail** - All payments tracked in database

---

## 📞 Support

### Stripe Support:
- Docs: https://stripe.com/docs
- Support: https://support.stripe.com

### Your Implementation:
- All code is in the repository
- Payment logic: `src/components/PaymentStep.jsx`
- Netlify function: `netlify/functions/create-payment-intent.js`
- Database setup: `database-migrations/`

---

**🎉 You're all set! Deploy to Netlify and start accepting payments!**
