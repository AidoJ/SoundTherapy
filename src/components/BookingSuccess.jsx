import React from 'react';
import { useNavigate } from 'react-router-dom';
import './BookingSuccess.css';

const BookingSuccess = () => {
  const navigate = useNavigate();

  return (
    <div className="booking-success">
      <div className="success-card">
        <div className="success-icon">✅</div>
        <h2>Booking Confirmed!</h2>
        <p>Your session has been booked successfully.</p>
        <p>You'll receive a confirmation email shortly with all the details.</p>
        <div className="success-info">
          <p><strong>Important:</strong> Please arrive 5 minutes before your scheduled time.</p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/')}>
          Back to Home
        </button>
      </div>
    </div>
  );
};

export default BookingSuccess;
