import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import './BookingList.css';

const BookingList = () => {
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [stats, setStats] = useState({
    total: 0,
    confirmed: 0,
    cashPending: 0,
    completed: 0
  });

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
  }, [selectedDate]);

  const loadBookings = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
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
        .gte('selectedslot', `${selectedDate}T00:00:00`)
        .lt('selectedslot', `${selectedDate}T23:59:59`)
        .order('selectedslot', { ascending: true });

      if (error) throw error;

      setBookings(data || []);
      updateStats(data || []);
    } catch (err) {
      console.error('Error loading bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStats = (bookingsData) => {
    const total = bookingsData.length;
    const confirmed = bookingsData.filter(b =>
      b.bookingstatus === 'confirmed' &&
      (b.paymentmethod !== 'Cash' || b.cash_received === true)
    ).length;
    const cashPending = bookingsData.filter(b =>
      b.paymentmethod === 'Cash' && b.cash_received === false
    ).length;
    const completed = bookingsData.filter(b => b.bookingstatus === 'completed').length;

    setStats({ total, confirmed, cashPending, completed });
  };

  const getFilteredBookings = () => {
    if (filter === 'cash-pending') {
      return bookings.filter(b => b.paymentmethod === 'Cash' && b.cash_received === false);
    } else if (filter === 'confirmed') {
      return bookings.filter(b =>
        b.bookingstatus === 'confirmed' &&
        (b.paymentmethod !== 'Cash' || b.cash_received === true)
      );
    } else if (filter !== 'all') {
      return bookings.filter(b => b.bookingstatus === filter);
    }
    return bookings;
  };

  const formatTime = (dateTimeString) => {
    // Parse time directly from the string to avoid timezone issues
    // Database stores: "2025-10-28T13:00:00" which should display as "13:00"
    if (dateTimeString && dateTimeString.includes('T')) {
      const timePart = dateTimeString.split('T')[1];
      if (timePart) {
        const [hours, minutes] = timePart.split(':');
        return `${hours}:${minutes}`;
      }
    }
    // Fallback to Date parsing
    const date = new Date(dateTimeString);
    return date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatPrice = (cents) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const getPaymentBadge = (booking) => {
    if (booking.paymentmethod === 'Cash') {
      if (booking.cash_received === true) {
        return <span className="status-badge cash-received">💵 Cash Received</span>;
      } else {
        return <span className="status-badge cash-pending">💵 Cash Due</span>;
      }
    } else {
      return <span className="status-badge paid">💳 Paid Online</span>;
    }
  };

  const formatStatus = (status) => {
    const statusMap = {
      'pending': '⏳ Pending',
      'confirmed': '✓ Confirmed',
      'in-progress': '▶️ In Progress',
      'completed': '✅ Completed'
    };
    return statusMap[status] || status;
  };

  const markCashReceived = async (bookingId, firstName, surname, price) => {
    if (!window.confirm(`Mark cash payment of ${formatPrice(price)} as received from ${firstName} ${surname}?`)) {
      return;
    }

    try {
      const { error } = await supabase.rpc('mark_cash_received', {
        p_booking_id: bookingId,
        p_received_by: 'Practitioner'
      });

      if (error) throw error;

      alert(`✓ Cash payment received from ${firstName} ${surname}\n\nBooking is now confirmed and ready to start.`);
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

  const completeSession = async (bookingId, firstName, surname) => {
    if (!window.confirm(`Complete session for ${firstName} ${surname}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          bookingstatus: 'completed',
          completedat: new Date().toISOString()
        })
        .eq('id', bookingId);

      if (error) throw error;

      alert(`✅ Session completed for ${firstName} ${surname}`);
      loadBookings();
    } catch (err) {
      console.error('Error completing session:', err);
      alert('❌ Error: ' + err.message);
    }
  };

  const getActionButtons = (booking) => {
    // Cash payment pending
    if (booking.paymentmethod === 'Cash' && booking.cash_received === false) {
      return (
        <>
          <button
            className="btn btn-warning"
            onClick={() => markCashReceived(booking.id, booking.firstname, booking.surname, booking.price_paid_cents)}
          >
            💵 Mark Cash Received
          </button>
          <button className="btn btn-secondary" onClick={() => viewDetails(booking)}>
            View Details
          </button>
        </>
      );
    }

    // Ready to start session
    if (booking.bookingstatus === 'confirmed') {
      return (
        <>
          <button
            className="btn btn-primary"
            onClick={() => startSession(booking.id)}
          >
            ▶️ Start Session
          </button>
          <button className="btn btn-secondary" onClick={() => viewDetails(booking)}>
            View Details
          </button>
        </>
      );
    }

    // Session in progress
    if (booking.bookingstatus === 'in-progress') {
      return (
        <button
          className="btn btn-success"
          onClick={() => completeSession(booking.id, booking.firstname, booking.surname)}
        >
          ✓ Complete Session
        </button>
      );
    }

    // Session completed
    if (booking.bookingstatus === 'completed') {
      return (
        <button className="btn btn-secondary" onClick={() => viewDetails(booking)}>
          View Session
        </button>
      );
    }

    return null;
  };

  const viewDetails = (booking) => {
    const paymentInfo = booking.paymentmethod === 'Cash'
      ? `Cash ${booking.cash_received ? '(Received)' : '(Pending)'}`
      : 'Stripe (Paid)';

    alert(`Booking Details:\n\nName: ${booking.firstname} ${booking.surname}\nService: ${booking.services?.service_name}\nTime: ${formatTime(booking.selectedslot)}\nDuration: ${booking.services?.duration_minutes} minutes\nPrice: ${formatPrice(booking.price_paid_cents)}\nPhone: ${booking.phone}\nEmail: ${booking.email}\nPayment: ${paymentInfo}\nStatus: ${booking.bookingstatus}`);
  };

  const filterBookings = (newFilter) => {
    setFilter(newFilter);
  };

  const refreshBookings = () => {
    loadBookings();
  };

  const currentDate = new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  const filteredBookings = getFilteredBookings();

  return (
    <div className="bookings-container">
      <header className="bookings-header">
        <div>
          <div className="header-title">📋 {isToday ? "Today's Bookings" : "Bookings"}</div>
          <div className="header-date">{currentDate}</div>
        </div>
        <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '2px solid #fff',
              background: 'rgba(255, 255, 255, 0.2)',
              color: '#fff',
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          />
          <button className="btn btn-secondary" onClick={refreshBookings}>🔄 Refresh</button>
        </div>
      </header>

      <div className="bookings-wrap">
        {/* Stats */}
        <div className="stats">
          <div className="stat-card">
            <div className="stat-label">Total Bookings</div>
            <div className="stat-value">{stats.total}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Confirmed</div>
            <div className="stat-value">{stats.confirmed}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Cash Pending</div>
            <div className="stat-value">{stats.cashPending}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Completed</div>
            <div className="stat-value">{stats.completed}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="filters">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => filterBookings('all')}
          >
            All
          </button>
          <button
            className={`filter-btn ${filter === 'confirmed' ? 'active' : ''}`}
            onClick={() => filterBookings('confirmed')}
          >
            Ready to Start
          </button>
          <button
            className={`filter-btn ${filter === 'cash-pending' ? 'active' : ''}`}
            onClick={() => filterBookings('cash-pending')}
          >
            Cash Payment Due ({stats.cashPending})
          </button>
          <button
            className={`filter-btn ${filter === 'in-progress' ? 'active' : ''}`}
            onClick={() => filterBookings('in-progress')}
          >
            In Progress
          </button>
          <button
            className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => filterBookings('completed')}
          >
            Completed ({stats.completed})
          </button>
        </div>

        {/* Bookings list */}
        {loading ? (
          <div className="empty-state">
            <div className="empty-state-icon">⏳</div>
            <p>Loading bookings...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <p>No bookings found for this filter.</p>
          </div>
        ) : (
          <div className="bookings-list">
            {filteredBookings.map(booking => (
              <div key={booking.id} className="booking-card">
                <div className="time-badge">
                  <div className="time">{formatTime(booking.selectedslot)}</div>
                  <div className="duration">{booking.services?.duration_minutes} min</div>
                </div>

                <div className="booking-info">
                  <div className="booking-name">{booking.firstname} {booking.surname}</div>
                  <div className="booking-contact">
                    <span>📱 {booking.phone}</span>
                    <span>✉️ {booking.email}</span>
                    <span>🎵 {booking.services?.service_name}</span>
                    <span>💰 {formatPrice(booking.price_paid_cents)}</span>
                  </div>
                  <div>
                    {getPaymentBadge(booking)}
                    <span className={`status-badge ${booking.bookingstatus}`}>
                      {formatStatus(booking.bookingstatus)}
                    </span>
                  </div>
                </div>

                <div className="booking-actions">
                  {getActionButtons(booking)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingList;
