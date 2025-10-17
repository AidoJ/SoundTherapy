# Booking System Setup Guide

This guide will help you set up the booking management system for your Sound Healing app.

## 🗄️ Database Setup

### 1. Create the Bookings Table

Run the SQL script in your Supabase SQL Editor:

```sql
-- Copy and paste the contents of database/bookings_schema.sql
```

This will create:
- `bookings` table with all necessary fields
- Indexes for better performance
- Sample data for testing
- Automatic timestamp updates

### 2. Verify Table Creation

Check that the table was created successfully:
- Go to Supabase Dashboard → Table Editor
- Look for the `bookings` table
- Verify it has the correct columns and sample data

## 🎯 Features Overview

### BookingList Component Features:
- **Date Filtering**: View bookings by specific date
- **Status Filtering**: Filter by booking status (pending, confirmed, in_progress, completed)
- **Status Management**: Update booking status with one click
- **Session Start**: Click "Start Session" to begin a session with pre-populated client data
- **Contact Actions**: Direct call functionality for client contact
- **Statistics**: Real-time booking statistics display
- **Mobile Optimized**: Responsive design for tablet/phone use

### Booking Status Flow:
1. **Pending** → New bookings awaiting confirmation
2. **Confirmed** → Bookings confirmed and ready to start
3. **In Progress** → Currently running sessions
4. **Completed** → Finished sessions

## 🔧 Integration Points

### Admin Panel Integration
The BookingList is integrated into the AdminPanel as a new "Bookings" tab:
- Access via Admin Panel → Bookings tab
- Full booking management interface
- Start Session button navigates to main app with booking data

### Session Flow Integration
When "Start Session" is clicked:
1. Booking status updates to "in_progress"
2. Client data (name, phone, email) is passed to IntakeForm
3. User is navigated to the main app session flow
4. IntakeForm auto-populates with booking data

## 📱 Mobile Market Stall Usage

### Two-Device Setup:
1. **Booking Device**: Admin panel for taking new bookings
2. **Session Device**: Main app for running sessions

### Workflow:
1. Take bookings on booking device (QuickBookingForm)
2. Manage bookings in Admin Panel → Bookings tab
3. Start sessions from booking device or session device
4. Complete sessions and update status

## 🚀 Quick Start

### 1. Set Up Database
```bash
# Run the SQL script in Supabase
# File: database/bookings_schema.sql
```

### 2. Test the System
1. Go to Admin Panel → Bookings tab
2. You should see sample bookings
3. Try updating booking status
4. Test "Start Session" functionality

### 3. Create Real Bookings
Use the QuickBookingForm component to create new bookings, or manually insert via Supabase.

## 🔍 Troubleshooting

### Common Issues:

**"No bookings found"**
- Check if the bookings table exists
- Verify sample data was inserted
- Check date filter settings

**"Error loading bookings"**
- Verify Supabase connection
- Check RLS policies if enabled
- Review browser console for specific errors

**"Start Session not working"**
- Ensure onStartSession prop is passed correctly
- Check navigation state handling
- Verify booking data structure

### Database Connection Issues:
1. Check Supabase URL and keys in environment variables
2. Verify table permissions
3. Test connection in Supabase dashboard

## 📊 Database Schema

### Bookings Table Structure:
```sql
- id: UUID (Primary Key)
- userID: VARCHAR(255) - Unique client identifier
- firstName: VARCHAR(100) - Client first name
- surname: VARCHAR(100) - Client last name
- phone: VARCHAR(20) - Contact phone
- email: VARCHAR(255) - Contact email
- serviceType: VARCHAR(100) - Type of service
- duration: INTEGER - Session duration in minutes
- selectedSlot: TIMESTAMPTZ - Booking date/time
- paymentMethod: VARCHAR(50) - Payment method used
- paymentStatus: VARCHAR(20) - Payment status
- bookingStatus: VARCHAR(20) - Booking status
- notes: TEXT - Additional notes
- createdAt: TIMESTAMPTZ - Creation timestamp
- updatedAt: TIMESTAMPTZ - Last update timestamp
```

## 🔐 Security Considerations

### Row Level Security (RLS):
The schema includes commented RLS policies. Uncomment and modify as needed:

```sql
-- Enable RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Add appropriate policies for your use case
```

### Environment Variables:
Ensure these are set in your deployment:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 📈 Future Enhancements

### Planned Features:
- Email/SMS notifications
- Calendar integration
- Payment processing integration
- Booking analytics dashboard
- Client history tracking
- Recurring booking support

### Customization Options:
- Modify booking statuses
- Add custom fields
- Integrate with external calendar systems
- Add booking confirmation emails
- Implement booking cancellation policies

## 🆘 Support

If you encounter issues:
1. Check the browser console for errors
2. Verify database connection and permissions
3. Review the component props and state management
4. Test with sample data first

The system includes fallback to mock data if database queries fail, ensuring the interface remains functional during setup or troubleshooting.
