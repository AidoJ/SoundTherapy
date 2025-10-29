import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import './BookingForm.css';

const BookingForm = ({ onBookingComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [services, setServices] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    surname: '',
    phone: '',
    email: '',
    contraindications: [],
    safetyScreenPassed: false,
    selectedService: null,
    selectedDate: '',
    selectedTimeSlot: null,
    paymentMethod: null
  });

  // Update progress bar
  const updateProgress = () => {
    return (currentStep / 6) * 100;
  };

  // Load services from database
  const loadServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setServices(data || []);
    } catch (err) {
      console.error('Error loading services:', err);
    }
  };

  // Generate time slots for selected date and check availability
  const generateTimeSlots = async (selectedDate) => {
    if (!selectedDate) return;

    try {
      const now = new Date();
      const selectedDay = new Date(selectedDate);
      const isToday = selectedDate === now.toISOString().split('T')[0];

      // Generate all possible slots
      const allSlots = [];
      const startHour = isToday ? now.getHours() : 9;
      const startMinute = isToday ? now.getMinutes() : 0;

      for (let h = startHour; h < 17; h++) {
        for (let m = 0; m < 60; m += 15) {
          if (isToday && h === now.getHours() && m <= now.getMinutes()) continue;
          const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
          allSlots.push(timeStr);
        }
      }

      // Get existing bookings for this date
      const { data: existingBookings, error } = await supabase
        .from('bookings')
        .select('selectedslot')
        .gte('selectedslot', `${selectedDate}T00:00:00`)
        .lt('selectedslot', `${selectedDate}T23:59:59`);

      if (error) throw error;

      // Extract booked times - parse directly from string to avoid timezone issues
      const bookedTimes = existingBookings?.map(booking => {
        // Database stores: "2025-10-28T13:00:00" - extract time as "13:00"
        if (booking.selectedslot && booking.selectedslot.includes('T')) {
          const timePart = booking.selectedslot.split('T')[1];
          if (timePart) {
            const [hours, minutes] = timePart.split(':');
            return `${hours}:${minutes}`;
          }
        }
        // Fallback
        return new Date(booking.selectedslot).toTimeString().slice(0, 5);
      }) || [];

      // Filter out booked slots
      const availableSlots = allSlots.map(time => ({
        time,
        available: !bookedTimes.includes(time)
      }));

      setTimeSlots(availableSlots);
    } catch (err) {
      console.error('Error generating time slots:', err);
      setTimeSlots([]);
    }
  };

  // Safety screen validation
  const checkSafety = (value) => {
    if (value === 'None') {
      setFormData(prev => ({
        ...prev,
        contraindications: [],
        safetyScreenPassed: true
      }));
    } else {
      const updated = [...formData.contraindications];
      if (updated.includes(value)) {
        updated.splice(updated.indexOf(value), 1);
      } else {
        updated.push(value);
      }

      setFormData(prev => ({
        ...prev,
        contraindications: updated,
        safetyScreenPassed: updated.length === 0
      }));
    }
  };

  // Step navigation
  const nextStep = () => {
    // Validation
    if (currentStep === 1) {
      if (!formData.firstName || !formData.surname || !formData.phone || !formData.email) {
        alert('Please fill in all required fields');
        return;
      }
    }

    if (currentStep === 2 && !formData.safetyScreenPassed) {
      alert('Please confirm the safety screen');
      return;
    }

    if (currentStep === 3 && !formData.selectedService) {
      alert('Please select a service');
      return;
    }

    if (currentStep === 4 && !formData.selectedDate) {
      alert('Please select a date');
      return;
    }

    if (currentStep === 4 && !formData.selectedTimeSlot) {
      alert('Please select a time slot');
      return;
    }

    if (currentStep === 5 && !formData.paymentMethod) {
      alert('Please select a payment method');
      return;
    }

    // Load data for next step
    if (currentStep === 2) loadServices();
    if (currentStep === 3 && formData.selectedDate) {
      generateTimeSlots(formData.selectedDate);
    }

    setCurrentStep(currentStep + 1);
    window.scrollTo(0, 0);
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
    window.scrollTo(0, 0);
  };

  // Confirm booking
  const confirmBooking = async () => {
    setLoading(true);

    try {
      const bookingData = {
        userid: `guest_${Date.now()}`,
        firstname: formData.firstName,
        surname: formData.surname,
        phone: formData.phone,
        email: formData.email,
        service_id: formData.selectedService.id,
        selectedslot: formData.selectedDate + 'T' + formData.selectedTimeSlot + ':00',
        duration: formData.selectedService.duration_minutes,
        paymentmethod: formData.paymentMethod === 'stripe' ? 'Stripe' : 'Cash',
        paymentstatus: formData.paymentMethod === 'stripe' ? 'paid' : 'pending',
        bookingstatus: 'confirmed',
        price_paid_cents: formData.selectedService.price_cents,
        safety_screen_completed: true,
        contraindications: JSON.stringify([]),
        cash_received: false
      };

      const { data, error } = await supabase
        .from('bookings')
        .insert([bookingData])
        .select()
        .single();

      if (error) throw error;

      if (formData.paymentMethod === 'stripe') {
        // In production: redirect to Stripe
        alert('Redirecting to Stripe payment...');
        // window.location.href = stripeCheckoutUrl;
      } else {
        setShowSuccess(true);
        if (onBookingComplete) onBookingComplete(data);
      }
    } catch (err) {
      console.error('Error creating booking:', err);
      alert('Error creating booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Render based on current state
  if (showSuccess) {
    return (
      <div className="booking-form-container">
        <div className="booking-step">
          <div className="success-banner">
            <h2>✅ Booking Confirmed!</h2>
            <p>Your session has been booked successfully.</p>
          </div>

          <div className="booking-summary">
            <div className="summary-row">
              <span>Name:</span>
              <span>{formData.firstName} {formData.surname}</span>
            </div>
            <div className="summary-row">
              <span>Contact:</span>
              <span>{formData.phone}</span>
            </div>
            <div className="summary-row">
              <span>Service:</span>
              <span>{formData.selectedService.service_name}</span>
            </div>
            <div className="summary-row">
              <span>Date:</span>
              <span>{new Date(formData.selectedDate).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
            <div className="summary-row">
              <span>Time:</span>
              <span>{formData.selectedTimeSlot}</span>
            </div>
            <div className="summary-row">
              <span>Payment:</span>
              <span>{formData.paymentMethod === 'stripe' ? 'Card (Paid)' : 'Cash (On arrival)'}</span>
            </div>
            <div className="summary-row total">
              <span>Total:</span>
              <span>${(formData.selectedService.price_cents / 100).toFixed(2)}</span>
            </div>
          </div>

          {formData.paymentMethod === 'cash' && (
            <div className="info-banner" style={{marginTop: '16px'}}>
              <strong>📱 What's Next?</strong><br/>
              • You'll receive an SMS reminder 15 minutes before your session<br/>
              • Please bring ${(formData.selectedService.price_cents / 100).toFixed(2)} cash when you arrive<br/>
              • Look for the Sound Healing booth at the market<br/>
              • Arrive 5 minutes early to check in
            </div>
          )}

          <button className="btn-primary" onClick={() => window.location.reload()} style={{marginTop: '20px'}}>
            Book Another Session
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-form-container">
      <header className="booking-header">
        📅 Book Your Sound Healing Session
      </header>

      {/* Progress bar */}
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${updateProgress()}%` }}></div>
      </div>

      {/* Info banner */}
      <div className="info-banner">
        <strong>🎪 Market Session Booking</strong><br/>
        Book your session today! Pay online with card or pay cash when you arrive. You'll receive SMS & email reminders.
      </div>

      {/* STEP 1: Client Details */}
      {currentStep === 1 && (
        <section className="booking-step">
          <h2>Step 1: Your Details</h2>
          <div className="form-grid">
            <div>
              <label>First Name <span className="required">*</span></label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                placeholder="First name"
              />
            </div>
            <div>
              <label>Surname <span className="required">*</span></label>
              <input
                type="text"
                value={formData.surname}
                onChange={(e) => setFormData({...formData, surname: e.target.value})}
                placeholder="Surname"
              />
            </div>
            <div>
              <label>Mobile Phone <span className="required">*</span></label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="04XX XXX XXX"
              />
              <span className="field-hint">For session reminders via SMS</span>
            </div>
            <div>
              <label>Email <span className="required">*</span></label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="your@email.com"
              />
            </div>
          </div>
          <div className="step-actions">
            <button className="btn-primary" onClick={nextStep}>Continue to Safety Screen →</button>
          </div>
        </section>
      )}

      {/* STEP 2: Safety Screen */}
      {currentStep === 2 && (
        <section className="booking-step">
          <h2>Step 2: Safety Screen</h2>
          <p className="step-description">Please confirm you do not have any contraindications. This ensures your safety during the session.</p>

          <div className="contraindications-list">
            {['Pacemakers/Implants', 'Deep Vein Thrombosis', 'Bleeding Disorders', 'Recent Surgery',
              'Severe Low Blood Pressure', 'Seizure Disorders', 'Acute Inflammation', 'Pregnancy',
              'Active Cancer Treatment'].map(item => (
              <label key={item} className="chip">
                <input
                  type="checkbox"
                  checked={formData.contraindications.includes(item)}
                  onChange={() => checkSafety(item)}
                />
                <strong>{item}</strong>
              </label>
            ))}
          </div>

          <div className="none-apply-box">
            <label className="chip chip-primary">
              <input
                type="checkbox"
                checked={formData.safetyScreenPassed}
                onChange={() => checkSafety('None')}
              />
              ✓ None of the above apply to me
            </label>
          </div>

          {formData.contraindications.length > 0 && (
            <div className="error-banner">
              <strong>⚠️ Session Not Suitable</strong><br/>
              Based on your responses, vibroacoustic therapy may not be suitable. Please consult your healthcare provider.
            </div>
          )}

          <div className="step-actions">
            <button className="btn-secondary" onClick={prevStep}>← Back</button>
            <button
              className="btn-primary"
              onClick={nextStep}
              disabled={!formData.safetyScreenPassed}
            >
              Continue to Select Service →
            </button>
          </div>
        </section>
      )}

      {/* STEP 3: Select Service */}
      {currentStep === 3 && (
        <section className="booking-step">
          <h2>Step 3: Choose Your Session</h2>
          <p className="step-description">Select the duration that suits your needs</p>

          <div className="services-grid">
            {services.map(service => (
              <div
                key={service.id}
                className={`service-card ${formData.selectedService?.id === service.id ? 'selected' : ''}`}
                onClick={() => setFormData({...formData, selectedService: service})}
              >
                <div className="service-header">
                  <div>
                    <span className="service-icon">{service.icon_emoji || '🎵'}</span>
                    <span className="service-name">{service.service_name}</span>
                  </div>
                  <div className="service-price">${(service.price_cents / 100).toFixed(2)}</div>
                </div>
                <div className="service-duration">{service.duration_minutes} minutes</div>
                <div className="service-desc">{service.description}</div>
              </div>
            ))}
          </div>

          <div className="step-actions">
            <button className="btn-secondary" onClick={prevStep}>← Back</button>
            <button
              className="btn-primary"
              onClick={nextStep}
              disabled={!formData.selectedService}
            >
              Continue to Select Time →
            </button>
          </div>
        </section>
      )}

      {/* STEP 4: Select Date & Time */}
      {currentStep === 4 && (
        <section className="booking-step">
          <h2>Step 4: Select Date & Time</h2>
          <p className="step-description">Choose your preferred date and time</p>

          <div className="form-grid">
            <div>
              <label>Select Date <span className="required">*</span></label>
              <input
                type="date"
                value={formData.selectedDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => {
                  setFormData({...formData, selectedDate: e.target.value, selectedTimeSlot: null});
                  generateTimeSlots(e.target.value);
                }}
                style={{marginBottom: '20px'}}
              />
            </div>
          </div>

          {formData.selectedDate && (
            <>
              <p className="step-description">Available time slots for {new Date(formData.selectedDate).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <div className="time-slots-grid">
                {timeSlots.length === 0 ? (
                  <p style={{gridColumn: '1 / -1', textAlign: 'center', color: 'var(--muted)'}}>No available time slots for this date</p>
                ) : (
                  timeSlots.map((slot, idx) => (
                    <div
                      key={idx}
                      className={`time-slot ${formData.selectedTimeSlot === slot.time ? 'selected' : ''} ${!slot.available ? 'unavailable' : ''}`}
                      onClick={() => slot.available && setFormData({...formData, selectedTimeSlot: slot.time})}
                      title={!slot.available ? 'This time slot is already booked' : ''}
                    >
                      {slot.time}
                      {!slot.available && <span style={{display: 'block', fontSize: '10px'}}>Booked</span>}
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          <div className="step-actions">
            <button className="btn-secondary" onClick={prevStep}>← Back</button>
            <button
              className="btn-primary"
              onClick={nextStep}
              disabled={!formData.selectedDate || !formData.selectedTimeSlot}
            >
              Continue to Payment →
            </button>
          </div>
        </section>
      )}

      {/* STEP 5: Payment Method */}
      {currentStep === 5 && (
        <section className="booking-step">
          <h2>Step 5: Payment Method</h2>
          <p className="step-description">How would you like to pay?</p>

          <div className="payment-options">
            <div
              className={`payment-option ${formData.paymentMethod === 'stripe' ? 'selected' : ''}`}
              onClick={() => setFormData({...formData, paymentMethod: 'stripe'})}
            >
              <div className="payment-icon">💳</div>
              <div className="payment-info">
                <div className="payment-name">Pay Now with Card</div>
                <div className="payment-desc">Secure online payment via Stripe • Instant confirmation</div>
              </div>
            </div>

            <div
              className={`payment-option ${formData.paymentMethod === 'cash' ? 'selected' : ''}`}
              onClick={() => setFormData({...formData, paymentMethod: 'cash'})}
            >
              <div className="payment-icon">💵</div>
              <div className="payment-info">
                <div className="payment-name">Pay Cash at Market</div>
                <div className="payment-desc">Reserve your spot • Pay when you arrive</div>
              </div>
            </div>
          </div>

          <div className="step-actions">
            <button className="btn-secondary" onClick={prevStep}>← Back</button>
            <button
              className="btn-primary"
              onClick={nextStep}
              disabled={!formData.paymentMethod}
            >
              Continue to Summary →
            </button>
          </div>
        </section>
      )}

      {/* STEP 6: Booking Summary */}
      {currentStep === 6 && (
        <section className="booking-step">
          <h2>Booking Summary</h2>

          <div className="booking-summary">
            <div className="summary-row">
              <span>Name:</span>
              <span>{formData.firstName} {formData.surname}</span>
            </div>
            <div className="summary-row">
              <span>Contact:</span>
              <span>{formData.phone}</span>
            </div>
            <div className="summary-row">
              <span>Service:</span>
              <span>{formData.selectedService?.service_name} ({formData.selectedService?.duration_minutes} min)</span>
            </div>
            <div className="summary-row">
              <span>Date:</span>
              <span>{new Date(formData.selectedDate).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
            <div className="summary-row">
              <span>Time:</span>
              <span>{formData.selectedTimeSlot}</span>
            </div>
            <div className="summary-row">
              <span>Payment Method:</span>
              <span>{formData.paymentMethod === 'stripe' ? 'Card Payment (Stripe)' : 'Cash at Market'}</span>
            </div>
            <div className="summary-row total">
              <span>Total:</span>
              <span>${(formData.selectedService?.price_cents / 100).toFixed(2)}</span>
            </div>
          </div>

          {formData.paymentMethod === 'cash' && (
            <div className="info-banner" style={{marginTop: '16px'}}>
              <strong>💵 Cash Payment</strong><br/>
              Your booking is reserved! Please bring exact cash payment when you arrive at the market.
            </div>
          )}

          <div className="step-actions">
            <button className="btn-secondary" onClick={prevStep}>← Back</button>
            <button
              className="btn-primary"
              onClick={confirmBooking}
              disabled={loading}
            >
              {loading ? 'Processing...' : (formData.paymentMethod === 'stripe' ? 'Proceed to Payment →' : 'Reserve Booking →')}
            </button>
          </div>
        </section>
      )}
    </div>
  );
};

export default BookingForm;
