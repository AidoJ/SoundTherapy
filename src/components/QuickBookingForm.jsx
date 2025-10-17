import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import './QuickBookingForm.css';

const QuickBookingForm = ({ onBookingComplete, onRequireFullIntake }) => {
  const [currentStep, setCurrentStep] = useState('safetyScreen'); // safetyScreen, booking, confirmation
  const [formData, setFormData] = useState({
    // Safety Screen - only "noneApply" can be checked
    noneApply: false,
    
    // Booking Details
    firstName: '',
    surname: '',
    phone: '',
    email: '',
    dateOfBirth: '',
    serviceType: '',
    duration: '',
    selectedDate: '',
    selectedSlot: '',
    paymentMethod: 'cash'
  });

  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(false);

  // Contraindications list (display only, not checkable except "None apply")
  const contraindications = [
    { id: 'pacemaker', label: 'Pacemakers/Implants', info: 'Pacemakers and other medical implants may be affected by electromagnetic fields.' },
    { id: 'dvt', label: 'Deep Vein Thrombosis', info: 'DVT requires medical clearance before any therapy sessions.' },
    { id: 'bleeding', label: 'Bleeding Disorders', info: 'Bleeding disorders may be exacerbated by certain frequencies.' },
    { id: 'surgery', label: 'Recent Surgery/Open Wounds', info: 'Recent surgery or open wounds require healing time before therapy.' },
    { id: 'bp', label: 'Severe Low Blood Pressure', info: 'Severe hypotension may be affected by relaxation frequencies.' },
    { id: 'seizure', label: 'Seizure Disorders', info: 'Certain frequencies may trigger seizures in susceptible individuals.' },
    { id: 'inflammatory', label: 'Acute Inflammatory Conditions', info: 'Active inflammation may be worsened by certain frequencies.' },
    { id: 'psychotic', label: 'Psychotic Conditions', info: 'Psychotic conditions require medical supervision for therapy.' },
    { id: 'pregnancy', label: 'Pregnancy', info: 'Pregnancy requires special consideration for frequency selection.' },
    { id: 'chemotherapy', label: 'Chemotherapy / Active Cancer Treatment', info: 'Active cancer treatment requires oncologist clearance before therapy.' }
  ];

  // Load available time slots based on selected date and duration
  useEffect(() => {
    if (formData.selectedDate && formData.duration) {
      loadAvailableSlots();
    }
  }, [formData.selectedDate, formData.duration]);

  const loadAvailableSlots = async () => {
    setLoading(true);
    try {
      // Get existing bookings for the selected date
      const { data: existingBookings, error } = await supabase
        .from('bookings')
        .select('selectedslot, duration')
        .gte('selectedslot', `${formData.selectedDate}T00:00:00`)
        .lt('selectedslot', `${formData.selectedDate}T23:59:59`)
        .in('bookingstatus', ['confirmed', 'in_progress']);

      if (error) {
        console.error('Error loading bookings:', error);
        setAvailableSlots([]);
        return;
      }

      // Generate available slots (9 AM to 6 PM, 30-minute intervals)
      const slots = [];
      const startHour = 9;
      const endHour = 18;
      const slotDuration = 30; // minutes
      const requestedDuration = parseInt(formData.duration);

      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += slotDuration) {
          const slotTime = new Date(`${formData.selectedDate}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`);
          const slotEndTime = new Date(slotTime.getTime() + requestedDuration * 60000);

          // Check if this slot conflicts with existing bookings
          const hasConflict = existingBookings.some(booking => {
            const bookingStart = new Date(booking.selectedslot);
            const bookingEnd = new Date(bookingStart.getTime() + booking.duration * 60000);

            return (slotTime < bookingEnd && slotEndTime > bookingStart);
          });

          if (!hasConflict) {
            slots.push({
              id: `${hour}-${minute}`,
              time: slotTime,
              display: slotTime.toLocaleTimeString('en-AU', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })
            });
          }
        }
      }

      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error calculating available slots:', error);
      setAvailableSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSafetyScreenChange = (field, value) => {
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

  const proceedToBooking = () => {
    if (formData.noneApply) {
      setCurrentStep('booking');
    } else {
      alert('Unfortunately, you have indicated a condition that may be a contraindication. We cannot proceed with this treatment unless you have a consent form from your GP or attending Physician.');
    }
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.firstName || !formData.surname || !formData.phone || 
        !formData.email || !formData.serviceType || !formData.duration || 
        !formData.selectedDate || !formData.selectedSlot) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    
    try {
      // Create booking data
      const selectedSlotTime = availableSlots.find(slot => slot.id === formData.selectedSlot);
      const bookingData = {
        userid: `user_${Date.now()}`,
        firstname: formData.firstName,
        surname: formData.surname,
        phone: formData.phone,
        email: formData.email,
        servicetype: formData.serviceType,
        duration: parseInt(formData.duration),
        selectedslot: selectedSlotTime.time.toISOString(),
        paymentmethod: formData.paymentMethod,
        paymentstatus: formData.paymentMethod === 'card' ? 'pending' : 'paid',
        bookingstatus: 'confirmed',
        notes: `Quick booking - DOB: ${formData.dateOfBirth || 'Not provided'}`
      };

      // Save to database
      const { error } = await supabase
        .from('bookings')
        .insert([bookingData]);

      if (error) {
        console.error('Error creating booking:', error);
        alert('Error creating booking: ' + error.message);
        return;
      }

      // Complete booking
      setCurrentStep('confirmation');
      onBookingComplete(bookingData);
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Error creating booking: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (currentStep === 'safetyScreen') {
    return (
      <div className="quick-booking-container">
        <div className="booking-header">
          <h2>4. Safety Screen</h2>
          <p>Please review the following conditions</p>
        </div>

        <div className="safety-screen">
          <div className="contraindications-list">
            {contraindications.map((item) => (
              <div key={item.id} className="contraindication-item">
                <div className="contraindication-info">
                  <span className="contraindication-label">{item.label}</span>
                  <span className="info-icon" title={item.info}>ℹ️</span>
                </div>
              </div>
            ))}
          </div>

          <div className="none-apply-section">
            <label className="none-apply-label">
              <input
                type="checkbox"
                checked={formData.noneApply}
                onChange={(e) => handleSafetyScreenChange('noneApply', e.target.checked)}
              />
              <span className="checkmark"></span>
              <strong>None apply</strong>
            </label>
          </div>

          <div className="safety-actions">
            <button 
              className="btn btn-primary btn-large"
              onClick={proceedToBooking}
              disabled={!formData.noneApply}
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

            <div className="form-row">
              <div className="form-group">
                <label>Date of Birth</label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleBookingChange('dateOfBirth', e.target.value)}
                  placeholder="dd/mm/yyyy"
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
                  <option value="Sound Healing Session">Sound Healing Session</option>
                  <option value="Vibroacoustic Therapy">Vibroacoustic Therapy</option>
                  <option value="PEMF Therapy">PEMF Therapy</option>
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
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Date *</label>
                <input
                  type="date"
                  value={formData.selectedDate}
                  onChange={(e) => handleBookingChange('selectedDate', e.target.value)}
                  required
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
          </div>

          {formData.selectedDate && formData.duration && (
            <div className="form-section">
              <h3>Available Times</h3>
              {loading ? (
                <div className="loading-slots">Loading available times...</div>
              ) : availableSlots.length > 0 ? (
                <div className="time-slots">
                  {availableSlots.map(slot => (
                    <label key={slot.id} className="time-slot">
                      <input
                        type="radio"
                        name="selectedSlot"
                        value={slot.id}
                        checked={formData.selectedSlot === slot.id}
                        onChange={(e) => handleBookingChange('selectedSlot', e.target.value)}
                      />
                      <span className="slot-time">{slot.display}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="no-slots">No available times for this date and duration.</div>
              )}
            </div>
          )}

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

            {formData.paymentMethod === 'card' && (
              <div className="stripe-payment">
                <p>Stripe payment module will be loaded here</p>
                {/* TODO: Integrate Stripe Elements */}
              </div>
            )}
          </div>

          <div className="booking-actions">
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={() => setCurrentStep('safetyScreen')}
            >
              Back
            </button>
            <button 
              type="submit" 
              className="btn btn-primary btn-large"
              disabled={loading}
            >
              {loading ? 'Creating Booking...' : 'Complete Booking'}
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
            <p><strong>Service:</strong> {formData.serviceType}</p>
            <p><strong>Duration:</strong> {formData.duration} minutes</p>
            <p><strong>Date:</strong> {new Date(formData.selectedDate).toLocaleDateString('en-AU')}</p>
            <p><strong>Time:</strong> {selectedSlotData ? selectedSlotData.display : 'Not selected'}</p>
            <p><strong>Payment:</strong> {formData.paymentMethod.toUpperCase()}</p>
          </div>

          <div className="confirmation-actions">
            <button 
              className="btn btn-primary btn-large"
              onClick={() => {
                setCurrentStep('safetyScreen');
                setFormData({
                  noneApply: false,
                  firstName: '',
                  surname: '',
                  phone: '',
                  email: '',
                  dateOfBirth: '',
                  serviceType: '',
                  duration: '',
                  selectedDate: '',
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