module.exports = (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    secrets_check: {
      stripe_secret: !!process.env.STRIPE_SECRET_KEY,
      database: !!process.env.DATABASE_URL,
    }
  });
};