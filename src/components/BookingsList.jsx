import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import './BookingsList.css';

const BookingsList = () => {
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    confirmed: 0,
    cashPending: 0,
    completed: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load today's bookings
  useEffect(() => {
    loadBookings();

    // Set up real-time subscription
    const subscription = supabase
      .channel('bookings_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => {
          loadBookings();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadBookings = async () => {
    try {
      setLoading(true);
      setError(null);

      const today = new Date().toISOString().split('T')[0];

      const { data, error: fetchError } = await supabase
        .from('bookings')
        .select(`
          *,
          services (
            service_name,
            duration_minutes,
            price_cents,
            icon_emoji
          )
        `)
        .gte('selectedslot', `${today}T00:00:00`)
        .lt('selectedslot', `${today}T23:59:59`)
        .order('selectedslot', { ascending: true });

      if (fetchError) throw fetchError;

      setBookings(data || []);

      // Calculate stats
      const total = data?.length || 0;
      const confirmed = data?.filter(b => b.bookingstatus === 'confirmed').length || 0;
      const cashPending = data?.filter(b => b.paymentmethod === 'Cash' && !b.cash_received).length || 0;
      const completed = data?.filter(b => b.bookingstatus === 'completed').length || 0;

      setStats({ total, confirmed, cashPending, completed });

    } catch (err) {
      console.error('Error loading bookings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const markCashReceived = async (bookingId) => {
    try {
      const practitionerName = prompt('Enter your name to confirm cash received:');
      if (!practitionerName) return;

      const { error } = await supabase.rpc('mark_cash_received', {
        p_booking_id: bookingId,
        p_received_by: practitionerName
      });

      if (error) throw error;

      alert('✅ Cash payment marked as received');
      loadBookings();
    } catch (err) {
      console.error('Error marking cash received:', err);
      alert('❌ Error: ' + err.message);
    }
  };

  const startSession = (bookingId) => {
    // Redirect to intake form with booking ID
    window.location.href = `/intake?bookingId=${bookingId}`;
  };

  const completeSession = async (bookingId) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          bookingstatus: 'completed',
          completedat: new Date().toISOString()
        })
        .eq('id', bookingId);

      if (error) throw error;

      alert('✅ Session marked as completed');
      loadBookings();
    } catch (err) {
      console.error('Error completing session:', err);
      alert('❌ Error: ' + err.message);
    }
  };

  const cancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;

    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          bookingstatus: 'cancelled',
          cancelledat: new Date().toISOString()
        })
        .eq('id', bookingId);

      if (error) throw error;

      alert('✅ Booking cancelled');
      loadBookings();
    } catch (err) {
      console.error('Error cancelling booking:', err);
      alert('❌ Error: ' + err.message);
    }
  };

  const getFilteredBookings = () => {
    switch (filter) {
      case 'ready':
        return bookings.filter(b => b.bookingstatus === 'confirmed' && b.cash_received !== false);
      case 'cash-due':
        return bookings.filter(b => b.paymentmethod === 'Cash' && !b.cash_received);
      case 'in-progress':
        return bookings.filter(b => b.bookingstatus === 'in-progress');
      case 'completed':
        return bookings.filter(b => b.bookingstatus === 'completed');
      default:
        return bookings;
    }
  };

  const formatTime = (dateTimeString) => {
    const date = new Date(dateTimeString);
    return date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formatPrice = (cents) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const getPaymentBadge = (booking) => {
    if (booking.paymentmethod === 'Stripe') {
      return <span className="badge badge-success">💳 Paid Online</span>;
    } else if (booking.cash_received) {
      return <span className="badge badge-success">💵 Cash Received</span>;
    } else {
      return <span className="badge badge-warning">💵 Cash Payment Due</span>;
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'confirmed': <span className="badge badge-info">✓ Confirmed</span>,
      'in-progress': <span className="badge badge-primary">▶️ In Progress</span>,
      'completed': <span className="badge badge-success">✓ Completed</span>,
      'cancelled': <span className="badge badge-danger">✗ Cancelled</span>
    };
    return badges[status] || <span className="badge">{status}</span>;
  };

  const getActionButtons = (booking) => {
    // Cash payment pending
    if (booking.paymentmethod === 'Cash' && !booking.cash_received) {
      return (
        <button
          className="btn-action btn-warning"
          onClick={() => markCashReceived(booking.id)}
        >
          💵 Mark Cash Received
        </button>
      );
    }

    // Ready to start session
    if (booking.bookingstatus === 'confirmed') {
      return (
        <div className="button-group">
          <button
            className="btn-action btn-primary"
            onClick={() => startSession(booking.id)}
          >
            ▶️ Start Session
          </button>
          <button
            className="btn-action btn-danger-outline"
            onClick={() => cancelBooking(booking.id)}
          >
            ✗ Cancel
          </button>
        </div>
      );
    }

    // Session in progress
    if (booking.bookingstatus === 'in-progress') {
      return (
        <button
          className="btn-action btn-success"
          onClick={() => completeSession(booking.id)}
        >
          ✓ Complete Session
        </button>
      );
    }

    // Completed
    if (booking.bookingstatus === 'completed') {
      return (
        <span className="text-muted">Session completed</span>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <div className="bookings-container">
        <div className="loading">Loading today's bookings...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bookings-container">
        <div className="error-banner">❌ Error loading bookings: {error}</div>
      </div>
    );
  }

  const filteredBookings = getFilteredBookings();

  return (
    <div className="bookings-container">
      <div className="bookings-header">
        <h1>📅 Today's Bookings</h1>
        <button className="btn-refresh" onClick={loadBookings}>
          🔄 Refresh
        </button>
      </div>

      {/* Stats Dashboard */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Bookings</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✓</div>
          <div className="stat-value">{stats.confirmed}</div>
          <div className="stat-label">Confirmed</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💵</div>
          <div className="stat-value">{stats.cashPending}</div>
          <div className="stat-label">Cash Payment Due</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-value">{stats.completed}</div>
          <div className="stat-label">Completed</div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="filter-buttons">
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({bookings.length})
        </button>
        <button
          className={`filter-btn ${filter === 'ready' ? 'active' : ''}`}
          onClick={() => setFilter('ready')}
        >
          Ready to Start
        </button>
        <button
          className={`filter-btn ${filter === 'cash-due' ? 'active' : ''}`}
          onClick={() => setFilter('cash-due')}
        >
          Cash Payment Due ({stats.cashPending})
        </button>
        <button
          className={`filter-btn ${filter === 'in-progress' ? 'active' : ''}`}
          onClick={() => setFilter('in-progress')}
        >
          In Progress
        </button>
        <button
          className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
          onClick={() => setFilter('completed')}
        >
          Completed ({stats.completed})
        </button>
      </div>

      {/* Bookings List */}
      <div className="bookings-list">
        {filteredBookings.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No bookings found</h3>
            <p>There are no bookings matching this filter.</p>
          </div>
        ) : (
          filteredBookings.map(booking => (
            <div key={booking.id} className="booking-card">
              <div className="booking-time-badge">
                {formatTime(booking.selectedslot)}
              </div>

              <div className="booking-content">
                <div className="booking-header">
                  <h3>
                    {booking.services?.icon_emoji || '🎵'} {booking.firstname} {booking.surname}
                  </h3>
                  <div className="booking-badges">
                    {getPaymentBadge(booking)}
                    {getStatusBadge(booking.bookingstatus)}
                  </div>
                </div>

                <div className="booking-details">
                  <div className="detail-row">
                    <span className="detail-label">📧 Email:</span>
                    <span className="detail-value">{booking.email}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">📱 Phone:</span>
                    <span className="detail-value">{booking.phone}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">🎵 Service:</span>
                    <span className="detail-value">
                      {booking.services?.service_name} ({booking.services?.duration_minutes} min)
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">💰 Price:</span>
                    <span className="detail-value">
                      {formatPrice(booking.services?.price_cents || booking.price_paid_cents)}
                    </span>
                  </div>

                  {booking.cash_received && (
                    <div className="detail-row">
                      <span className="detail-label">✓ Cash received by:</span>
                      <span className="detail-value">
                        {booking.cash_received_by} at {formatTime(booking.cash_received_at)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="booking-actions">
                  {getActionButtons(booking)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default BookingsList;
