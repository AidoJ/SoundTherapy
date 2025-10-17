import React, { useState, useEffect } from 'react';
import './QuickBookingForm.css';

const QuickBookingForm = ({ onBookingComplete, onRequireFullIntake }) => {
  const [currentStep, setCurrentStep] = useState('healthGate'); // healthGate, booking, confirmation
  const [formData, setFormData] = useState({
    // Health Gate
    hasPacemaker: false,
    isPregnant: false,
    recentSurgery: false,
    activeCancerTreatment: false,
    
    // Booking Details
    firstName: '',
    surname: '',
    phone: '',
    email: '',
    serviceType: '',
    duration: '',
    selectedSlot: '',
    paymentMethod: 'cash'
  });

  const [availableSlots, setAvailableSlots] = useState([]);

  // Generate available time slots (mock data for now)
  useEffect(() => {
    const generateSlots = () => {
      const slots = [];
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      // Generate slots for next 3 days
      for (let day = 0; day < 3; day++) {
        const currentDay = new Date(today);
        currentDay.setDate(today.getDate() + day);
        
        // Generate slots from 9 AM to 6 PM, every 30 minutes
        for (let hour = 9; hour < 18; hour++) {
          for (let minute = 0; minute < 60; minute += 30) {
            const slotTime = new Date(currentDay);
            slotTime.setHours(hour, minute, 0, 0);
            
            // Only show future slots
            if (slotTime > now) {
              slots.push({
                id: `${day}-${hour}-${minute}`,
                datetime: slotTime,
                available: Math.random() > 0.3 // Mock availability
              });
            }
          }
        }
      }
      
      setAvailableSlots(slots.filter(slot => slot.available));
    };

    generateSlots();
  }, []);

  const handleHealthGateChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleBookingChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const checkHealthGate = () => {
    const hasContraindications = 
      formData.hasPacemaker || 
      formData.isPregnant || 
      formData.recentSurgery || 
      formData.activeCancerTreatment;

    if (hasContraindications) {
      // Redirect to full intake form
      onRequireFullIntake(formData);
    } else {
      // Proceed to booking
      setCurrentStep('booking');
    }
  };

  const handleBookingSubmit = (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.firstName || !formData.surname || !formData.phone || 
        !formData.serviceType || !formData.duration || !formData.selectedSlot) {
      alert('Please fill in all required fields');
      return;
    }

    // Complete booking
    setCurrentStep('confirmation');
    onBookingComplete(formData);
  };

  const formatTimeSlot = (datetime) => {
    const date = datetime.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
    const time = datetime.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    return `${date} at ${time}`;
  };

  const getNextAvailableSlots = () => {
    return availableSlots.slice(0, 6); // Show next 6 available slots
  };

  if (currentStep === 'healthGate') {
    return (
      <div className="quick-booking-container">
        <div className="booking-header">
          <h2>Quick Health Check</h2>
          <p>Please answer these questions to proceed with booking</p>
        </div>

        <div className="health-gate">
          <div className="health-question">
            <label className="health-label">
              <input
                type="checkbox"
                checked={formData.hasPacemaker}
                onChange={(e) => handleHealthGateChange('hasPacemaker', e.target.checked)}
              />
              <span className="checkmark"></span>
              <strong>Pacemaker or medical implants</strong>
            </label>
          </div>

          <div className="health-question">
            <label className="health-label">
              <input
                type="checkbox"
                checked={formData.isPregnant}
                onChange={(e) => handleHealthGateChange('isPregnant', e.target.checked)}
              />
              <span className="checkmark"></span>
              <strong>Currently pregnant</strong>
            </label>
          </div>

          <div className="health-question">
            <label className="health-label">
              <input
                type="checkbox"
                checked={formData.recentSurgery}
                onChange={(e) => handleHealthGateChange('recentSurgery', e.target.checked)}
              />
              <span className="checkmark"></span>
              <strong>Recent surgery (last 6 weeks)</strong>
            </label>
          </div>

          <div className="health-question">
            <label className="health-label">
              <input
                type="checkbox"
                checked={formData.activeCancerTreatment}
                onChange={(e) => handleHealthGateChange('activeCancerTreatment', e.target.checked)}
              />
              <span className="checkmark"></span>
              <strong>Active cancer treatment</strong>
            </label>
          </div>

          <div className="health-gate-actions">
            <button 
              className="btn btn-primary btn-large"
              onClick={checkHealthGate}
            >
              Continue to Booking
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'booking') {
    return (
      <div className="quick-booking-container">
        <div className="booking-header">
          <h2>Book Your Session</h2>
          <p>Complete your booking details</p>
        </div>

        <form onSubmit={handleBookingSubmit} className="booking-form">
          <div className="form-section">
            <h3>Contact Details</h3>
            <div className="form-row">
              <div className="form-group">
                <label>First Name *</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleBookingChange('firstName', e.target.value)}
                  required
                  placeholder="Enter first name"
                />
              </div>
              <div className="form-group">
                <label>Surname *</label>
                <input
                  type="text"
                  value={formData.surname}
                  onChange={(e) => handleBookingChange('surname', e.target.value)}
                  required
                  placeholder="Enter surname"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Phone *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleBookingChange('phone', e.target.value)}
                  required
                  placeholder="Enter phone number"
                />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleBookingChange('email', e.target.value)}
                  required
                  placeholder="Enter email address"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Session Details</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Service Type *</label>
                <select
                  value={formData.serviceType}
                  onChange={(e) => handleBookingChange('serviceType', e.target.value)}
                  required
                >
                  <option value="">Select service</option>
                  <option value="vibroacoustic">Vibroacoustic Therapy</option>
                  <option value="pemf">PEMF Therapy</option>
                </select>
              </div>
              <div className="form-group">
                <label>Duration *</label>
                <select
                  value={formData.duration}
                  onChange={(e) => handleBookingChange('duration', e.target.value)}
                  required
                >
                  <option value="">Select duration</option>
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Available Times</h3>
            <div className="time-slots">
              {getNextAvailableSlots().map(slot => (
                <label key={slot.id} className="time-slot">
                  <input
                    type="radio"
                    name="selectedSlot"
                    value={slot.id}
                    checked={formData.selectedSlot === slot.id}
                    onChange={(e) => handleBookingChange('selectedSlot', e.target.value)}
                  />
                  <span className="slot-time">{formatTimeSlot(slot.datetime)}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-section">
            <h3>Payment Method</h3>
            <div className="payment-options">
              <label className="payment-option">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cash"
                  checked={formData.paymentMethod === 'cash'}
                  onChange={(e) => handleBookingChange('paymentMethod', e.target.value)}
                />
                <span>Cash</span>
              </label>
              <label className="payment-option">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="card"
                  checked={formData.paymentMethod === 'card'}
                  onChange={(e) => handleBookingChange('paymentMethod', e.target.value)}
                />
                <span>Credit Card</span>
              </label>
              <label className="payment-option">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="foc"
                  checked={formData.paymentMethod === 'foc'}
                  onChange={(e) => handleBookingChange('paymentMethod', e.target.value)}
                />
                <span>FOC (Free of Charge)</span>
              </label>
            </div>
          </div>

          <div className="booking-actions">
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={() => setCurrentStep('healthGate')}
            >
              Back
            </button>
            <button 
              type="submit" 
              className="btn btn-primary btn-large"
            >
              Complete Booking
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (currentStep === 'confirmation') {
    const selectedSlotData = availableSlots.find(slot => slot.id === formData.selectedSlot);
    
    return (
      <div className="quick-booking-container">
        <div className="booking-header">
          <h2>Booking Confirmed!</h2>
          <div className="success-icon">✓</div>
        </div>

        <div className="confirmation-details">
          <div className="confirmation-section">
            <h3>Session Details</h3>
            <p><strong>Name:</strong> {formData.firstName} {formData.surname}</p>
            <p><strong>Phone:</strong> {formData.phone}</p>
            <p><strong>Email:</strong> {formData.email}</p>
            <p><strong>Service:</strong> {formData.serviceType === 'vibroacoustic' ? 'Vibroacoustic Therapy' : 'PEMF Therapy'}</p>
            <p><strong>Duration:</strong> {formData.duration} minutes</p>
            <p><strong>Time:</strong> {selectedSlotData ? formatTimeSlot(selectedSlotData.datetime) : 'Not selected'}</p>
            <p><strong>Payment:</strong> {formData.paymentMethod.toUpperCase()}</p>
          </div>

          <div className="confirmation-actions">
            <button 
              className="btn btn-primary btn-large"
              onClick={() => {
                setCurrentStep('healthGate');
                setFormData({
                  hasPacemaker: false,
                  isPregnant: false,
                  recentSurgery: false,
                  activeCancerTreatment: false,
                  firstName: '',
                  surname: '',
                  phone: '',
                  email: '',
                  serviceType: '',
                  duration: '',
                  selectedSlot: '',
                  paymentMethod: 'cash'
                });
              }}
            >
              Book Another Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default QuickBookingForm;
