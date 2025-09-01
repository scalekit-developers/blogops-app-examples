// Simple auth guard middleware (Requirement 3 - middleware pattern)
function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

module.exports = { requireAuth };
