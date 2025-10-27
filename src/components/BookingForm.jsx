import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import './BookingForm.css';

const BookingForm = ({ onBookingComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [services, setServices] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    surname: '',
    phone: '',
    email: '',
    contraindications: [],
    safetyScreenPassed: false,
    selectedService: null,
    selectedTimeSlot: null,
    paymentMethod: null
  });

  // Load services from database
  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error loading services:', error);
      alert('Failed to load services. Please refresh the page.');
    }
  };

  const generateTimeSlots = () => {
    const slots = [];
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    let startHour = currentHour;
    let startMinute = Math.ceil(currentMinute / 15) * 15;
    if (startMinute >= 60) {
      startHour++;
      startMinute = 0;
    }

    // Generate slots until 5pm
    for (let h = startHour; h < 17; h++) {
      for (let m = (h === startHour ? startMinute : 0); m < 60; m += 15) {
        if (h >= 17) break;
        const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        slots.push({ time: timeStr, available: true }); // TODO: Check actual availability from database
      }
    }

    setTimeSlots(slots);
  };

  const checkSafety = (contraindication) => {
    let updatedContraindications = [...formData.contraindications];

    if (contraindication === 'None') {
      // If "None apply" is selected, clear all others
      updatedContraindications = [];
      setFormData(prev => ({
        ...prev,
        contraindications: [],
        safetyScreenPassed: true
      }));
    } else {
      // If a contraindication is selected
      if (updatedContraindications.includes(contraindication)) {
        // Remove it
        updatedContraindications = updatedContraindications.filter(c => c !== contraindication);
      } else {
        // Add it
        updatedContraindications.push(contraindication);
      }

      setFormData(prev => ({
        ...prev,
        contraindications: updatedContraindications,
        safetyScreenPassed: updatedContraindications.length === 0
      }));
    }
  };

  const nextStep = (step) => {
    // Validation for each step
    if (step === 1) {
      if (!formData.firstName || !formData.surname || !formData.phone || !formData.email) {
        alert('Please fill in all required fields');
        return;
      }
    }

    if (step === 2 && !formData.safetyScreenPassed) {
      alert('Please confirm that none of the contraindications apply to you');
      return;
    }

    if (step === 3 && !formData.selectedService) {
      alert('Please select a service');
      return;
    }

    if (step === 4 && !formData.selectedTimeSlot) {
      alert('Please select a time slot');
      return;
    }

    if (step === 5 && !formData.paymentMethod) {
      alert('Please select a payment method');
      return;
    }

    // Special actions on step transitions
    if (step === 3) {
      generateTimeSlots();
    }

    setCurrentStep(currentStep + 1);
    window.scrollTo(0, 0);
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
    window.scrollTo(0, 0);
  };

  const confirmBooking = async () => {
    setLoading(true);

    try {
      // Create booking in database
      const bookingData = {
        userid: `guest_${Date.now()}`, // TODO: Use actual user ID if logged in
        firstname: formData.firstName,
        surname: formData.surname,
        phone: formData.phone,
        email: formData.email,
        service_id: formData.selectedService.id,
        selectedslot: new Date().toISOString().split('T')[0] + 'T' + formData.selectedTimeSlot + ':00',
        duration: formData.selectedService.duration_minutes,
        paymentmethod: formData.paymentMethod === 'stripe' ? 'Stripe' : 'Cash',
        paymentstatus: formData.paymentMethod === 'stripe' ? 'paid' : 'pending',
        bookingstatus: 'confirmed',
        price_paid_cents: formData.selectedService.price_cents,
        safety_screen_completed: true,
        contraindications: JSON.stringify([]),
        cash_received: false,
        notes: formData.paymentMethod === 'cash' ? 'Cash payment on arrival' : 'Online payment'
      };

      const { data, error } = await supabase
        .from('bookings')
        .insert([bookingData])
        .select()
        .single();

      if (error) throw error;

      // Handle payment method
      if (formData.paymentMethod === 'stripe') {
        // TODO: Redirect to Stripe payment
        alert('Redirecting to Stripe payment...');
        // window.location.href = `/api/create-stripe-session?bookingId=${data.id}`;
      } else {
        // Cash payment - show success
        if (onBookingComplete) {
          onBookingComplete(data);
        }
        setCurrentStep(7); // Success screen
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const progressPercent = (currentStep / 6) * 100;

  return (
    <div className="booking-form-container">
      {/* Progress bar */}
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
      </div>

      {/* Info banner */}
      {currentStep <= 6 && (
        <div className="info-banner">
          <strong>🎪 Market Session Booking</strong><br />
          Book your session today! Pay online with card or pay cash when you arrive.
        </div>
      )}

      {/* STEP 1: Client Details */}
      {currentStep === 1 && (
        <div className="booking-step">
          <h2>Step 1: Your Details</h2>
          <div className="form-grid">
            <div>
              <label>First Name <span className="required">*</span></label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="First name"
                required
              />
            </div>
            <div>
              <label>Surname <span className="required">*</span></label>
              <input
                type="text"
                value={formData.surname}
                onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                placeholder="Surname"
                required
              />
            </div>
            <div>
              <label>Mobile Phone <span className="required">*</span></label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="04XX XXX XXX"
                required
              />
              <span className="field-hint">For session reminders via SMS</span>
            </div>
            <div>
              <label>Email <span className="required">*</span></label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="your@email.com"
                required
              />
            </div>
          </div>
          <div className="step-actions">
            <button className="btn-primary" onClick={() => nextStep(1)}>
              Continue to Safety Screen →
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Safety Screen */}
      {currentStep === 2 && (
        <div className="booking-step">
          <h2>Step 2: Safety Screen</h2>
          <p className="step-description">
            Please confirm you do not have any contraindications. This ensures your safety during the session.
          </p>

          <div className="contraindications-list">
            {[
              'Pacemakers/Implants',
              'Deep Vein Thrombosis',
              'Bleeding Disorders',
              'Recent Surgery',
              'Severe Low Blood Pressure',
              'Seizure Disorders',
              'Acute Inflammation',
              'Pregnancy',
              'Active Cancer'
            ].map(item => (
              <label key={item} className="chip">
                <input
                  type="checkbox"
                  checked={formData.contraindications.includes(item)}
                  onChange={() => checkSafety(item)}
                />
                {item}
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
              <strong>⚠️ Session Not Suitable</strong><br />
              Based on your responses, vibroacoustic therapy may not be suitable. Please consult your healthcare provider.
            </div>
          )}

          <div className="step-actions">
            <button className="btn-secondary" onClick={prevStep}>← Back</button>
            <button
              className="btn-primary"
              onClick={() => nextStep(2)}
              disabled={!formData.safetyScreenPassed}
            >
              Continue to Select Service →
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Select Service */}
      {currentStep === 3 && (
        <div className="booking-step">
          <h2>Step 3: Choose Your Session</h2>
          <p className="step-description">Select the duration that suits your needs</p>

          <div className="services-grid">
            {services.map(service => (
              <div
                key={service.id}
                className={`service-card ${formData.selectedService?.id === service.id ? 'selected' : ''}`}
                onClick={() => setFormData({ ...formData, selectedService: service })}
              >
                <div className="service-header">
                  <div>
                    <span className="service-icon">{service.icon_emoji}</span>
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
              onClick={() => nextStep(3)}
              disabled={!formData.selectedService}
            >
              Continue to Select Time →
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Select Time Slot */}
      {currentStep === 4 && (
        <div className="booking-step">
          <h2>Step 4: Select Time</h2>
          <p className="step-description">Choose your preferred time</p>

          <div className="time-slots-grid">
            {timeSlots.map(slot => (
              <div
                key={slot.time}
                className={`time-slot ${formData.selectedTimeSlot === slot.time ? 'selected' : ''} ${!slot.available ? 'unavailable' : ''}`}
                onClick={() => slot.available && setFormData({ ...formData, selectedTimeSlot: slot.time })}
              >
                {slot.time}
              </div>
            ))}
          </div>

          <div className="step-actions">
            <button className="btn-secondary" onClick={prevStep}>← Back</button>
            <button
              className="btn-primary"
              onClick={() => nextStep(4)}
              disabled={!formData.selectedTimeSlot}
            >
              Continue to Payment →
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: Payment Method */}
      {currentStep === 5 && (
        <div className="booking-step">
          <h2>Step 5: Payment Method</h2>
          <p className="step-description">How would you like to pay?</p>

          <div className="payment-options">
            <div
              className={`payment-option ${formData.paymentMethod === 'stripe' ? 'selected' : ''}`}
              onClick={() => setFormData({ ...formData, paymentMethod: 'stripe' })}
            >
              <div className="payment-icon">💳</div>
              <div className="payment-info">
                <div className="payment-name">Pay Now with Card</div>
                <div className="payment-desc">Secure online payment via Stripe • Instant confirmation</div>
              </div>
            </div>

            <div
              className={`payment-option ${formData.paymentMethod === 'cash' ? 'selected' : ''}`}
              onClick={() => setFormData({ ...formData, paymentMethod: 'cash' })}
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
              onClick={() => nextStep(5)}
              disabled={!formData.paymentMethod}
            >
              Continue to Summary →
            </button>
          </div>
        </div>
      )}

      {/* STEP 6: Booking Summary */}
      {currentStep === 6 && (
        <div className="booking-step">
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
            <div className="info-banner" style={{ marginTop: '16px' }}>
              <strong>💵 Cash Payment</strong><br />
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
        </div>
      )}

      {/* STEP 7: Success */}
      {currentStep === 7 && (
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
              <span>Service:</span>
              <span>{formData.selectedService?.service_name}</span>
            </div>
            <div className="summary-row">
              <span>Time:</span>
              <span>{formData.selectedTimeSlot}</span>
            </div>
            <div className="summary-row total">
              <span>Total:</span>
              <span>${(formData.selectedService?.price_cents / 100).toFixed(2)}</span>
            </div>
          </div>

          {formData.paymentMethod === 'cash' ? (
            <div className="info-banner" style={{ marginTop: '16px' }}>
              <strong>📱 What's Next?</strong><br />
              • You'll receive an SMS reminder 15 minutes before your session<br />
              • Please bring ${(formData.selectedService?.price_cents / 100).toFixed(2)} cash when you arrive<br />
              • Look for the Sound Healing booth at the market<br />
              • Arrive 5 minutes early to check in
            </div>
          ) : (
            <div className="success-banner" style={{ marginTop: '16px' }}>
              <strong>✅ Payment Confirmed</strong><br />
              • You'll receive an SMS reminder 15 minutes before your session<br />
              • Check your email for booking confirmation<br />
              • Look for the Sound Healing booth at the market<br />
              • Arrive 5 minutes early to check in
            </div>
          )}

          <button className="btn-primary" onClick={() => window.location.reload()}>
            Book Another Session
          </button>
        </div>
      )}
    </div>
  );
};

export default BookingForm;
