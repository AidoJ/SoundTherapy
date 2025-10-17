import { supabase } from './supabaseClient';

export const bookingService = {
  // Get all bookings for a specific date
  async getBookingsByDate(date) {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .gte('selectedSlot', `${date}T00:00:00`)
        .lt('selectedSlot', `${date}T23:59:59`)
        .order('selectedSlot', { ascending: true });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching bookings by date:', error);
      return { data: null, error };
    }
  },

  // Get bookings by status
  async getBookingsByStatus(status) {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('bookingStatus', status)
        .order('selectedSlot', { ascending: true });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching bookings by status:', error);
      return { data: null, error };
    }
  },

  // Get all bookings with optional filters
  async getAllBookings(filters = {}) {
    try {
      let query = supabase
        .from('bookings')
        .select('*')
        .order('selectedSlot', { ascending: true });

      // Apply filters
      if (filters.date) {
        query = query
          .gte('selectedSlot', `${filters.date}T00:00:00`)
          .lt('selectedSlot', `${filters.date}T23:59:59`);
      }

      if (filters.status && filters.status !== 'all') {
        query = query.eq('bookingStatus', filters.status);
      }

      if (filters.paymentStatus) {
        query = query.eq('paymentStatus', filters.paymentStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching all bookings:', error);
      return { data: null, error };
    }
  },

  // Create a new booking
  async createBooking(bookingData) {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .insert([bookingData])
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error creating booking:', error);
      return { data: null, error };
    }
  },

  // Update booking status
  async updateBookingStatus(bookingId, newStatus) {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .update({ bookingStatus: newStatus })
        .eq('id', bookingId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error updating booking status:', error);
      return { data: null, error };
    }
  },

  // Update booking payment status
  async updatePaymentStatus(bookingId, paymentStatus) {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .update({ paymentStatus })
        .eq('id', bookingId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error updating payment status:', error);
      return { data: null, error };
    }
  },

  // Update booking details
  async updateBooking(bookingId, updates) {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .update(updates)
        .eq('id', bookingId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error updating booking:', error);
      return { data: null, error };
    }
  },

  // Delete a booking
  async deleteBooking(bookingId) {
    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Error deleting booking:', error);
      return { error };
    }
  },

  // Get booking statistics
  async getBookingStats(date) {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('bookingStatus, paymentStatus')
        .gte('selectedSlot', `${date}T00:00:00`)
        .lt('selectedSlot', `${date}T23:59:59`);

      if (error) throw error;

      // Calculate stats
      const stats = {
        total: data.length,
        pending: data.filter(b => b.bookingStatus === 'pending').length,
        confirmed: data.filter(b => b.bookingStatus === 'confirmed').length,
        in_progress: data.filter(b => b.bookingStatus === 'in_progress').length,
        completed: data.filter(b => b.bookingStatus === 'completed').length,
        paid: data.filter(b => b.paymentStatus === 'paid').length,
        pending_payment: data.filter(b => b.paymentStatus === 'pending').length
      };

      return { data: stats, error: null };
    } catch (error) {
      console.error('Error fetching booking stats:', error);
      return { data: null, error };
    }
  },

  // Get available time slots for a date
  async getAvailableSlots(date, duration = 30) {
    try {
      // Get existing bookings for the date
      const { data: existingBookings, error } = await supabase
        .from('bookings')
        .select('selectedSlot, duration')
        .gte('selectedSlot', `${date}T00:00:00`)
        .lt('selectedSlot', `${date}T23:59:59`)
        .in('bookingStatus', ['confirmed', 'in_progress']);

      if (error) throw error;

      // Generate available slots (9 AM to 6 PM, 30-minute intervals)
      const availableSlots = [];
      const startHour = 9;
      const endHour = 18;
      const slotDuration = 30; // minutes

      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += slotDuration) {
          const slotTime = new Date(`${date}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`);
          const slotEndTime = new Date(slotTime.getTime() + duration * 60000);

          // Check if this slot conflicts with existing bookings
          const hasConflict = existingBookings.some(booking => {
            const bookingStart = new Date(booking.selectedSlot);
            const bookingEnd = new Date(bookingStart.getTime() + booking.duration * 60000);

            return (slotTime < bookingEnd && slotEndTime > bookingStart);
          });

          if (!hasConflict) {
            availableSlots.push(slotTime.toISOString());
          }
        }
      }

      return { data: availableSlots, error: null };
    } catch (error) {
      console.error('Error fetching available slots:', error);
      return { data: null, error };
    }
  }
};
