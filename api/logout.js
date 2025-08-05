module.exports = (req, res) => {
  const baseUrl = req.headers.host?.includes('localhost') ? 'http://localhost:5000' : `https://${req.headers.host}`;
  res.redirect(302, baseUrl);
};