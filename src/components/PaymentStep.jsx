import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import './PaymentStep.css';

// Initialize Stripe (using publishable key from environment)
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

/**
 * Stripe Payment Form Component
 * Handles card payment processing using Stripe Elements
 */
const StripePaymentForm = ({ amount, serviceName, onSuccess, onError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setErrorMessage('');

    try {
      // Confirm the payment with Stripe
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/booking-success',
        },
        redirect: 'if_required' // Don't redirect, handle inline
      });

      if (error) {
        console.error('Payment error:', error);
        setErrorMessage(error.message || 'Payment failed. Please try again.');
        if (onError) onError(error);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        console.log('✅ Payment successful!', paymentIntent);
        if (onSuccess) {
          onSuccess({
            paymentIntentId: paymentIntent.id,
            amountPaid: paymentIntent.amount,
            status: paymentIntent.status
          });
        }
      }
    } catch (err) {
      console.error('Payment exception:', err);
      setErrorMessage('An unexpected error occurred. Please try again.');
      if (onError) onError(err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="stripe-payment-form">
      <div className="payment-amount-display">
        <div className="amount-label">Amount to Pay:</div>
        <div className="amount-value">${(amount / 100).toFixed(2)} AUD</div>
      </div>

      <div className="payment-element-container">
        <PaymentElement />
      </div>

      {errorMessage && (
        <div className="error-message">
          ❌ {errorMessage}
        </div>
      )}

      <button
        type="submit"
        className="btn-primary pay-button"
        disabled={!stripe || processing}
      >
        {processing ? 'Processing...' : `Pay $${(amount / 100).toFixed(2)} Now`}
      </button>

      <div className="stripe-badge">
        <img src="https://stripe.com/img/v3/home/social.png" alt="Powered by Stripe" style={{height: '20px', opacity: 0.6}} />
      </div>
    </form>
  );
};

/**
 * Cash Payment Component
 * Handles cash payment tracking with amount input
 */
const CashPaymentForm = ({ expectedAmount, onConfirm }) => {
  const [amountReceived, setAmountReceived] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = () => {
    const amount = parseFloat(amountReceived);

    if (!amountReceived || isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (amount < (expectedAmount / 100)) {
      setError(`Amount must be at least $${(expectedAmount / 100).toFixed(2)}`);
      return;
    }

    setError('');
    setConfirmed(true);

    if (onConfirm) {
      onConfirm({
        amountReceivedCents: Math.round(amount * 100),
        expectedAmountCents: expectedAmount
      });
    }
  };

  return (
    <div className="cash-payment-form">
      <div className="payment-amount-display">
        <div className="amount-label">Session Price:</div>
        <div className="amount-value">${(expectedAmount / 100).toFixed(2)} AUD</div>
      </div>

      <div className="cash-input-group">
        <label htmlFor="cashAmount">Cash Amount Received:</label>
        <div className="input-with-currency">
          <span className="currency-symbol">$</span>
          <input
            type="number"
            id="cashAmount"
            step="0.01"
            min="0"
            placeholder={(expectedAmount / 100).toFixed(2)}
            value={amountReceived}
            onChange={(e) => setAmountReceived(e.target.value)}
            disabled={confirmed}
          />
          <span className="currency-code">AUD</span>
        </div>
      </div>

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      <div className="cash-confirmation">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            disabled={!amountReceived}
          />
          <span>I confirm that cash payment has been received</span>
        </label>
      </div>

      <button
        className="btn-primary"
        onClick={handleConfirm}
        disabled={!amountReceived || !confirmed}
      >
        Complete Cash Payment
      </button>

      <div className="cash-note">
        💵 Cash payment must be received before completing the booking.
        This ensures your market slot is secured.
      </div>
    </div>
  );
};

/**
 * Main Payment Step Component
 * Handles payment method selection and payment processing
 */
const PaymentStep = ({ service, customerEmail, onPaymentSuccess, onBack }) => {
  const [paymentMethod, setPaymentMethod] = useState(null); // 'card' or 'cash'
  const [clientSecret, setClientSecret] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Create payment intent when card payment is selected
  useEffect(() => {
    if (paymentMethod === 'card' && !clientSecret) {
      createPaymentIntent();
    }
  }, [paymentMethod]);

  const createPaymentIntent = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/.netlify/functions/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: service.price_cents,
          service_name: service.service_name,
          customer_email: customerEmail
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }

      const data = await response.json();
      setClientSecret(data.clientSecret);
    } catch (err) {
      console.error('Error creating payment intent:', err);
      setError('Failed to initialize payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCardPaymentSuccess = (paymentData) => {
    if (onPaymentSuccess) {
      onPaymentSuccess({
        method: 'Stripe',
        status: 'paid',
        amountPaidCents: paymentData.amountPaid,
        stripePaymentIntentId: paymentData.paymentIntentId,
        cashReceived: false
      });
    }
  };

  const handleCashPaymentConfirm = (cashData) => {
    if (onPaymentSuccess) {
      onPaymentSuccess({
        method: 'Cash',
        status: 'paid',
        amountPaidCents: cashData.amountReceivedCents,
        stripePaymentIntentId: null,
        cashReceived: true
      });
    }
  };

  return (
    <div className="payment-step">
      <h2>Step 5: Payment</h2>
      <p className="step-description">
        Secure your booking with payment now
      </p>

      {/* Payment Method Selection */}
      {!paymentMethod && (
        <div className="payment-method-selection">
          <div
            className="payment-option"
            onClick={() => setPaymentMethod('card')}
          >
            <div className="payment-icon">💳</div>
            <div className="payment-info">
              <div className="payment-name">Pay with Card</div>
              <div className="payment-desc">Secure payment • Instant confirmation</div>
            </div>
          </div>

          <div
            className="payment-option"
            onClick={() => setPaymentMethod('cash')}
          >
            <div className="payment-icon">💵</div>
            <div className="payment-info">
              <div className="payment-name">Pay with Cash</div>
              <div className="payment-desc">Payment received at market</div>
            </div>
          </div>
        </div>
      )}

      {/* Card Payment */}
      {paymentMethod === 'card' && (
        <div className="payment-form-container">
          <div className="payment-method-header">
            <button className="btn-link" onClick={() => { setPaymentMethod(null); setClientSecret(null); }}>
              ← Change Payment Method
            </button>
            <h3>💳 Card Payment</h3>
          </div>

          {loading && <div className="loading-message">Initializing payment...</div>}
          {error && <div className="error-message">{error}</div>}

          {clientSecret && !loading && (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <StripePaymentForm
                amount={service.price_cents}
                serviceName={service.service_name}
                onSuccess={handleCardPaymentSuccess}
                onError={(err) => setError(err.message)}
              />
            </Elements>
          )}
        </div>
      )}

      {/* Cash Payment */}
      {paymentMethod === 'cash' && (
        <div className="payment-form-container">
          <div className="payment-method-header">
            <button className="btn-link" onClick={() => setPaymentMethod(null)}>
              ← Change Payment Method
            </button>
            <h3>💵 Cash Payment</h3>
          </div>

          <CashPaymentForm
            expectedAmount={service.price_cents}
            onConfirm={handleCashPaymentConfirm}
          />
        </div>
      )}

      {/* Back Button (only show if no payment method selected) */}
      {!paymentMethod && (
        <div className="step-actions">
          <button className="btn-secondary" onClick={onBack}>
            ← Back
          </button>
        </div>
      )}
    </div>
  );
};

export default PaymentStep;
