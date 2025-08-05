module.exports = (req, res) => {
  const baseUrl = req.headers.host?.includes('localhost') ? 'http://localhost:5000' : `https://${req.headers.host}`;
  const replitAuthUrl = `https://replit.com/auth/oauth2/authorize?client_id=${process.env.REPLIT_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(baseUrl + '/api/auth/callback')}`;
  
  res.redirect(302, replitAuthUrl);
};