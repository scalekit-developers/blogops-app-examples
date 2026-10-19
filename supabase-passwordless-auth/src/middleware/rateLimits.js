const rateLimit = require('express-rate-limit');
const env = require('../config/env');

// Global rate limit
const globalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
});

// Per-email passwordless send limit (2 per minute default per requirement docs)
const sendEmailLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_AUTH_EMAIL_WINDOW_MS,
  max: env.RATE_LIMIT_AUTH_EMAIL_MAX,
  keyGenerator: req => {
    const email = (req.body && req.body.email) || '';
    return email.toLowerCase().trim() || req.ip;
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many passwordless emails requested. Please wait and try again.' },
});

module.exports = { globalLimiter, sendEmailLimiter };
