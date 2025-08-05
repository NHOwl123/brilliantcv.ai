module.exports = (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Return demo user for testing
  return res.json({
    id: 'demo-user-123',
    email: 'demo@brilliantcv.ai',
    firstName: 'Demo',
    lastName: 'User',
    subscriptionTier: 'free',
    subscriptionStatus: 'active',
    applicationsRemaining: 5
  });
};