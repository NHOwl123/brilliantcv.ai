const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { priceId } = req.body || {};
    
    if (!priceId) {
      return res.status(400).json({ message: 'Price ID is required' });
    }

    // Create payment intent for subscription
    const paymentIntent = await stripe.paymentIntents.create({
      amount: priceId === process.env.STRIPE_PREMIUM_PRICE_ID ? 200 : 100, // $2 or $1
      currency: 'usd',
      metadata: { priceId }
    });

    return res.json({ 
      clientSecret: paymentIntent.client_secret,
      message: 'Subscription created successfully'
    });

  } catch (error) {
    console.error('Stripe error:', error);
    return res.status(500).json({ 
      message: 'Error creating subscription',
      error: error.message 
    });
  }
};