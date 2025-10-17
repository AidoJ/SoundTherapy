import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import './BookingList.css';

const BookingList = ({ onStartSession }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBooking, setNewBooking] = useState({
    firstName: '',
    surname: '',
    phone: '',
    email: '',
    duration: 30,
    selectedSlot: '',
    notes: ''
  });

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('selectedSlot', { ascending: true });

      if (error) {
        console.error('Error loading bookings:', error);
        setBookings([]);
      } else {
        setBookings(data || []);
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId, newStatus) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ bookingStatus: newStatus })
        .eq('id', bookingId);

      if (error) {
        console.error('Error updating booking status:', error);
        alert('Error updating booking status: ' + error.message);
      } else {
        loadBookings(); // Reload to get fresh data
      }
    } catch (error) {
      console.error('Error updating booking status:', error);
      alert('Error updating booking status: ' + error.message);
    }
  };

  const addBooking = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const bookingData = {
        ...newBooking,
        userID: `user_${Date.now()}`,
        serviceType: 'Sound Healing Session',
        paymentMethod: 'Stripe',
        paymentStatus: 'paid',
        bookingStatus: 'confirmed'
      };

      const { error } = await supabase
        .from('bookings')
        .insert([bookingData]);

      if (error) {
        console.error('Error adding booking:', error);
        alert('Error adding booking: ' + error.message);
      } else {
        alert('Booking added successfully!');
        setShowAddForm(false);
        setNewBooking({
          firstName: '',
          surname: '',
          phone: '',
          email: '',
          duration: 30,
          selectedSlot: '',
          notes: ''
        });
        loadBookings();
      }
    } catch (error) {
      console.error('Error adding booking:', error);
      alert('Error adding booking: ' + error.message);
    } finally {
      setLoading(false);
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
    if (onStartSession) {
      onStartSession(bookingData);
    }
  };

  const formatTime = (dateTimeString) => {
    return new Date(dateTimeString).toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateTimeString) => {
    return new Date(dateTimeString).toLocaleDateString('en-AU');
  };

  return (
    <div className="booking-list">
      <div className="booking-header">
        <h2>Bookings ({bookings.length})</h2>
        <button 
          className="btn-add-booking" 
          onClick={() => setShowAddForm(true)}
        >
          + Add New Booking
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading bookings...</div>
      ) : (
        <div className="bookings-table">
          {bookings.length === 0 ? (
            <div className="no-bookings">
              <p>No bookings found. Add your first booking!</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Date & Time</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td>
                      <div className="client-info">
                        <strong>{booking.firstName} {booking.surname}</strong>
                        <div className="contact-info">
                          {booking.phone} | {booking.email}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="datetime-info">
                        <div>{formatDate(booking.selectedSlot)}</div>
                        <div>{formatTime(booking.selectedSlot)}</div>
                      </div>
                    </td>
                    <td>{booking.duration} min</td>
                    <td>
                      <span className={`status-badge ${booking.bookingStatus}`}>
                        {booking.bookingStatus}
                      </span>
                    </td>
                    <td>
                      <div className="actions">
                        {booking.bookingStatus === 'confirmed' && (
                          <button
                            className="btn-start"
                            onClick={() => handleStartSession(booking)}
                          >
                            Start Session
                          </button>
                        )}
                        
                        {booking.bookingStatus === 'pending' && (
                          <button
                            className="btn-confirm"
                            onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                          >
                            Confirm
                          </button>
                        )}
                        
                        {booking.bookingStatus === 'in_progress' && (
                          <button
                            className="btn-complete"
                            onClick={() => updateBookingStatus(booking.id, 'completed')}
                          >
                            Complete
                          </button>
                        )}

                        <button
                          className="btn-call"
                          onClick={() => window.open(`tel:${booking.phone}`)}
                        >
                          📞
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Add Booking Modal */}
      {showAddForm && (
        <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Add New Booking</h3>
            <form onSubmit={addBooking}>
              <div className="form-row">
                <input
                  type="text"
                  placeholder="First Name"
                  required
                  value={newBooking.firstName}
                  onChange={e => setNewBooking({...newBooking, firstName: e.target.value})}
                />
                <input
                  type="text"
                  placeholder="Surname"
                  required
                  value={newBooking.surname}
                  onChange={e => setNewBooking({...newBooking, surname: e.target.value})}
                />
              </div>
              
              <div className="form-row">
                <input
                  type="tel"
                  placeholder="Phone"
                  required
                  value={newBooking.phone}
                  onChange={e => setNewBooking({...newBooking, phone: e.target.value})}
                />
                <input
                  type="email"
                  placeholder="Email"
                  required
                  value={newBooking.email}
                  onChange={e => setNewBooking({...newBooking, email: e.target.value})}
                />
              </div>

              <div className="form-row">
                <input
                  type="datetime-local"
                  placeholder="Date & Time"
                  required
                  value={newBooking.selectedSlot}
                  onChange={e => setNewBooking({...newBooking, selectedSlot: e.target.value})}
                />
                <select
                  value={newBooking.duration}
                  onChange={e => setNewBooking({...newBooking, duration: parseInt(e.target.value)})}
                >
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                </select>
              </div>

              <textarea
                placeholder="Notes (optional)"
                value={newBooking.notes}
                onChange={e => setNewBooking({...newBooking, notes: e.target.value})}
              />

              <div className="modal-actions">
                <button type="button" onClick={() => setShowAddForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Add Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingList;