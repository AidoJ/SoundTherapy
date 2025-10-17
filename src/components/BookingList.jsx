import React, { useState, useEffect } from 'react';
import { bookingService } from '../services/bookingService';
import './BookingList.css';

const BookingList = ({ onStartSession }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, confirmed, in_progress, completed
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Mock data for development - replace with actual Supabase queries
  const mockBookings = [
    {
      id: 1,
      userID: 'user_001',
      firstName: 'Sarah',
      surname: 'Johnson',
      phone: '0412 345 678',
      email: 'sarah.j@email.com',
      serviceType: 'Sound Healing Session',
      duration: 30,
      selectedSlot: '2024-01-15T10:00:00',
      paymentMethod: 'Stripe',
      paymentStatus: 'paid',
      bookingStatus: 'confirmed',
      createdAt: '2024-01-14T09:30:00',
      notes: 'First time client, interested in stress relief'
    },
    {
      id: 2,
      userID: 'user_002',
      firstName: 'Michael',
      surname: 'Chen',
      phone: '0433 987 654',
      email: 'm.chen@email.com',
      serviceType: 'Sound Healing Session',
      duration: 45,
      selectedSlot: '2024-01-15T11:00:00',
      paymentMethod: 'Stripe',
      paymentStatus: 'paid',
      bookingStatus: 'pending',
      createdAt: '2024-01-14T10:15:00',
      notes: 'Returning client, prefers longer sessions'
    },
    {
      id: 3,
      userID: 'user_003',
      firstName: 'Emma',
      surname: 'Williams',
      phone: '0422 111 222',
      email: 'emma.w@email.com',
      serviceType: 'Sound Healing Session',
      duration: 30,
      selectedSlot: '2024-01-15T14:00:00',
      paymentMethod: 'Stripe',
      paymentStatus: 'paid',
      bookingStatus: 'in_progress',
      createdAt: '2024-01-14T11:00:00',
      notes: 'Currently in session'
    }
  ];

  useEffect(() => {
    loadBookings();
  }, [selectedDate, filter]);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const { data, error } = await bookingService.getAllBookings({
        date: selectedDate,
        status: filter
      });

      if (error) {
        console.error('Error loading bookings:', error);
        // Fallback to mock data if database query fails
        let filteredBookings = mockBookings;
        if (filter !== 'all') {
          filteredBookings = mockBookings.filter(booking => booking.bookingStatus === filter);
        }
        setBookings(filteredBookings);
      } else {
        setBookings(data || []);
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
      // Fallback to mock data
      let filteredBookings = mockBookings;
      if (filter !== 'all') {
        filteredBookings = mockBookings.filter(booking => booking.bookingStatus === filter);
      }
      setBookings(filteredBookings);
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId, newStatus) => {
    try {
      const { data, error } = await bookingService.updateBookingStatus(bookingId, newStatus);

      if (error) {
        console.error('Error updating booking status:', error);
        alert('Error updating booking status: ' + error.message);
      } else {
        // Update local state on success
        setBookings(prev => prev.map(booking => 
          booking.id === bookingId 
            ? { ...booking, bookingStatus: newStatus }
            : booking
        ));
      }
    } catch (error) {
      console.error('Error updating booking status:', error);
      alert('Error updating booking status: ' + error.message);
    }
  };

  const handleStartSession = (booking) => {
    const bookingData = {
      firstName: booking.firstName,
      surname: booking.surname,
      phone: booking.phone,
      email: booking.email
    };
    
    // Update booking status to in_progress
    updateBookingStatus(booking.id, 'in_progress');
    
    // Pass booking data to parent component
    onStartSession(bookingData);
  };

  const formatTime = (dateTimeString) => {
    return new Date(dateTimeString).toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'confirmed': return '#10b981';
      case 'in_progress': return '#3b82f6';
      case 'completed': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'confirmed': return '✅';
      case 'in_progress': return '🎵';
      case 'completed': return '✓';
      default: return '❓';
    }
  };

  const filteredBookings = bookings.filter(booking => {
    if (filter === 'all') return true;
    return booking.bookingStatus === filter;
  });

  return (
    <div className="booking-list">
      <div className="booking-header">
        <h2>Bookings Management</h2>
        <div className="booking-controls">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="date-picker"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="status-filter"
          >
            <option value="all">All Bookings</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading bookings...</div>
      ) : (
        <div className="bookings-container">
          {filteredBookings.length === 0 ? (
            <div className="no-bookings">
              <p>No bookings found for {selectedDate}</p>
            </div>
          ) : (
            <div className="bookings-grid">
              {filteredBookings.map((booking) => (
                <div key={booking.id} className="booking-card">
                  <div className="booking-card-header">
                    <div className="client-info">
                      <h3>{booking.firstName} {booking.surname}</h3>
                      <p className="booking-time">{formatTime(booking.selectedSlot)}</p>
                    </div>
                    <div 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(booking.bookingStatus) }}
                    >
                      {getStatusIcon(booking.bookingStatus)} {booking.bookingStatus.replace('_', ' ')}
                    </div>
                  </div>

                  <div className="booking-details">
                    <div className="detail-row">
                      <span className="label">Duration:</span>
                      <span className="value">{booking.duration} min</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Phone:</span>
                      <span className="value">{booking.phone}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Email:</span>
                      <span className="value">{booking.email}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Payment:</span>
                      <span className="value">{booking.paymentStatus}</span>
                    </div>
                    {booking.notes && (
                      <div className="detail-row">
                        <span className="label">Notes:</span>
                        <span className="value">{booking.notes}</span>
                      </div>
                    )}
                  </div>

                  <div className="booking-actions">
                    {booking.bookingStatus === 'confirmed' && (
                      <button
                        className="btn-start"
                        onClick={() => handleStartSession(booking)}
                      >
                        🎵 Start Session
                      </button>
                    )}
                    
                    {booking.bookingStatus === 'pending' && (
                      <button
                        className="btn-confirm"
                        onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                      >
                        ✅ Confirm
                      </button>
                    )}
                    
                    {booking.bookingStatus === 'in_progress' && (
                      <button
                        className="btn-complete"
                        onClick={() => updateBookingStatus(booking.id, 'completed')}
                      >
                        ✓ Complete
                      </button>
                    )}

                    <button
                      className="btn-contact"
                      onClick={() => window.open(`tel:${booking.phone}`)}
                    >
                      📞 Call
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="booking-stats">
        <div className="stat">
          <span className="stat-number">{bookings.filter(b => b.bookingStatus === 'pending').length}</span>
          <span className="stat-label">Pending</span>
        </div>
        <div className="stat">
          <span className="stat-number">{bookings.filter(b => b.bookingStatus === 'confirmed').length}</span>
          <span className="stat-label">Confirmed</span>
        </div>
        <div className="stat">
          <span className="stat-number">{bookings.filter(b => b.bookingStatus === 'in_progress').length}</span>
          <span className="stat-label">In Progress</span>
        </div>
        <div className="stat">
          <span className="stat-number">{bookings.filter(b => b.bookingStatus === 'completed').length}</span>
          <span className="stat-label">Completed</span>
        </div>
      </div>
    </div>
  );
};

export default BookingList;
