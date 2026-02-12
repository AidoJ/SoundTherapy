/**
 * Netlify Function: Create Stripe Payment Intent
 *
 * This function runs server-side to keep your Stripe secret key secure.
 * It creates a payment intent for the booking amount.
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { amount, service_name, customer_email } = JSON.parse(event.body);

    // Validate amount
    if (!amount || amount <= 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid amount' })
      };
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // Amount in cents
      currency: 'aud',
      description: `Sound Healing Session: ${service_name || 'Vibroacoustic Therapy'}`,
      receipt_email: customer_email || null,
      metadata: {
        service_name: service_name || 'Vibroacoustic Therapy',
        integration: 'sound-healing-app'
      }
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // Adjust for production
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      })
    };

  } catch (error) {
    console.error('Error creating payment intent:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to create payment intent',
        message: error.message
      })
    };
  }
};
