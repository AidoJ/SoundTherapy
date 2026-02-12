import { supabase } from './supabaseClient';

/**
 * Fetch all active services from the database
 */
export const fetchActiveServices = async () => {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Error fetching services:', err);
    return { data: null, error: err };
  }
};

/**
 * Fetch a single service by ID
 */
export const fetchServiceById = async (serviceId) => {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('id', serviceId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Error fetching service:', err);
    return { data: null, error: err };
  }
};

/**
 * Check slot availability for a given date and time
 */
export const checkSlotAvailability = async (selectedSlot, serviceId) => {
  try {
    // Get service details to know max_bookings_per_slot
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('max_bookings_per_slot')
      .eq('id', serviceId)
      .single();

    if (serviceError) throw serviceError;

    const maxBookings = service?.max_bookings_per_slot || 1;

    // Count existing bookings for this slot (excluding cancelled)
    const { data: existingBookings, error: bookingError } = await supabase
      .from('bookings')
      .select('id')
      .eq('selectedslot', selectedSlot)
      .neq('bookingstatus', 'cancelled');

    if (bookingError) throw bookingError;

    const currentBookings = existingBookings?.length || 0;
    const available = currentBookings < maxBookings;

    return {
      available,
      currentBookings,
      maxBookings,
      spotsLeft: maxBookings - currentBookings,
      error: null
    };
  } catch (err) {
    console.error('Error checking slot availability:', err);
    return {
      available: false,
      currentBookings: 0,
      maxBookings: 0,
      spotsLeft: 0,
      error: err
    };
  }
};

/**
 * Generate available time slots for today
 */
export const generateTodayTimeSlots = (startHour = 9, endHour = 17, intervalMinutes = 15) => {
  const today = new Date();
  const slots = [];

  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += intervalMinutes) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const slotDateTime = new Date(today);
      slotDateTime.setHours(hour, minute, 0, 0);

      // Only add future slots (not in the past)
      if (slotDateTime > new Date()) {
        slots.push({
          time: timeString,
          datetime: slotDateTime.toISOString(),
          display: timeString
        });
      }
    }
  }

  return slots;
};

/**
 * Create a new booking
 */
export const createBooking = async (bookingData) => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .insert([bookingData])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Error creating booking:', err);
    return { data: null, error: err };
  }
};

/**
 * Fetch a booking by ID
 */
export const fetchBookingById = async (bookingId) => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        services (
          service_name,
          duration_minutes,
          price_cents,
          icon_emoji,
          description
        )
      `)
      .eq('id', bookingId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Error fetching booking:', err);
    return { data: null, error: err };
  }
};

/**
 * Fetch today's bookings (for practitioner dashboard)
 */
export const fetchTodayBookings = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        services (
          service_name,
          duration_minutes,
          price_cents,
          icon_emoji,
          description
        )
      `)
      .gte('selectedslot', `${today}T00:00:00`)
      .lt('selectedslot', `${today}T23:59:59`)
      .order('selectedslot', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Error fetching today\'s bookings:', err);
    return { data: null, error: err };
  }
};

/**
 * Update booking status
 */
export const updateBookingStatus = async (bookingId, status, additionalData = {}) => {
  try {
    const updateData = {
      bookingstatus: status,
      ...additionalData
    };

    // Add timestamp fields based on status
    if (status === 'in-progress') {
      updateData.startedat = new Date().toISOString();
    } else if (status === 'completed') {
      updateData.completedat = new Date().toISOString();
    } else if (status === 'cancelled') {
      updateData.cancelledat = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', bookingId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Error updating booking status:', err);
    return { data: null, error: err };
  }
};

/**
 * Mark cash as received for a booking
 */
export const markCashReceived = async (bookingId, receivedBy) => {
  try {
    const { data, error } = await supabase.rpc('mark_cash_received', {
      p_booking_id: bookingId,
      p_received_by: receivedBy
    });

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Error marking cash received:', err);
    return { data: null, error: err };
  }
};

/**
 * Update booking payment details (for Stripe payments)
 */
export const updateBookingPayment = async (bookingId, paymentIntentId) => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .update({
        stripe_payment_intent_id: paymentIntentId,
        paymentstatus: 'paid',
        paymentmethod: 'Stripe',
        bookingstatus: 'confirmed'
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Error updating payment:', err);
    return { data: null, error: err };
  }
};

/**
 * Cancel a booking
 */
export const cancelBooking = async (bookingId, reason = null) => {
  try {
    const updateData = {
      bookingstatus: 'cancelled',
      cancelledat: new Date().toISOString()
    };

    if (reason) {
      updateData.cancellation_reason = reason;
    }

    const { data, error } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', bookingId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Error cancelling booking:', err);
    return { data: null, error: err };
  }
};

/**
 * Send booking confirmation email (placeholder - implement with your email service)
 */
export const sendBookingConfirmation = async (booking) => {
  // TODO: Implement email sending via Supabase Edge Function or third-party service
  console.log('Sending booking confirmation email for:', booking.id);

  // Example: You could call a Supabase Edge Function here
  // const { data, error } = await supabase.functions.invoke('send-booking-email', {
  //   body: { bookingId: booking.id, type: 'confirmation' }
  // });

  return { success: true, message: 'Email sending not yet implemented' };
};

/**
 * Send booking reminder SMS (placeholder - implement with your SMS service)
 */
export const sendBookingReminder = async (booking, minutesBefore) => {
  // TODO: Implement SMS sending via Twilio or similar service
  console.log(`Sending reminder ${minutesBefore} minutes before session for:`, booking.id);

  return { success: true, message: 'SMS sending not yet implemented' };
};

/**
 * Subscribe to real-time booking updates
 */
export const subscribeToBookingUpdates = (callback) => {
  const subscription = supabase
    .channel('bookings_changes')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'bookings' },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();

  return subscription;
};

/**
 * Unsubscribe from booking updates
 */
export const unsubscribeFromBookings = (subscription) => {
  if (subscription) {
    subscription.unsubscribe();
  }
};
