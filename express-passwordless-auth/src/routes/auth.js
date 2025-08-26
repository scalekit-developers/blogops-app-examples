const express = require('express');
const Joi = require('joi');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { sendPasswordlessEmail, resendPasswordlessEmail, verifyWithCode, verifyWithLink } = require('../services/authService');
const { sendEmailLimiter } = require('../middleware/rateLimits');
const { AppError } = require('../utils/errors');

const router = express.Router();

// Send passwordless email (only requires email). Dashboard config decides OTP / LINK / LINK_OTP.
// All other advanced parameters removed for simplicity.
router.post('/passwordless/email/send', sendEmailLimiter, async (req, res, next) => {
  try {
  const input = { ...req.query, ...req.body };
  const schema = Joi.object({ email: Joi.string().email().required() });
  const { value, error } = schema.validate({ email: input.email });
    if (error) throw new AppError('Validation error', 400, error.details);
    // Start minimal; retry adding magiclinkAuthUri if SDK demands it.
    const base = env.NEXT_PUBLIC_BASE_URL || `http://localhost:${env.PORT}`;
    const derivedMagicLink = (env.PASSWORDLESS_MAGICLINK_URI_OVERRIDE || base.replace(/\/$/, '') + '/api/auth/passwordless/verify');
    let response;
    try {
      response = await sendPasswordlessEmail(value.email, { template: 'SIGNIN' });
    } catch (e) {
      const msg = (e && e.details && e.details.sdkError) || e.message || '';
      if (/magiclink_auth_uri is required/i.test(msg)) {
        response = await sendPasswordlessEmail(value.email, { template: 'SIGNIN', magiclinkAuthUri: derivedMagicLink });
      } else {
        throw e;
      }
    }

    res.json(response);
  } catch (err) { next(err); }
});

router.post('/passwordless/email/resend', async (req, res, next) => {
  try {
    const schema = Joi.object({ authRequestId: Joi.string().required() });
    const { value, error } = schema.validate(req.body);
    if (error) throw new AppError('Validation error', 400, error.details);
    const response = await resendPasswordlessEmail(value.authRequestId);
    res.json(response);
  } catch (err) {
    next(err);
  }
});

router.post('/passwordless/email/verify/code', async (req, res, next) => {
  try {
    const schema = Joi.object({ code: Joi.string().length(6).required(), authRequestId: Joi.string().required() });
    const { value, error } = schema.validate(req.body);
    if (error) throw new AppError('Validation error', 400, error.details);
  const { user, verifyResponse } = await verifyWithCode(value.code, value.authRequestId);
  req.session.user = user;
  const token = env.JWT_ENABLED ? jwt.sign({ sub: user.id, email: user.email }, env.JWT_SECRET, { expiresIn: '4h' }) : undefined;
  res.json({ user, token, verify: verifyResponse });
  } catch (err) {
    next(err);
  }
});

// Magic link GET endpoint (user lands here). Accept link_token & optional auth_request_id
router.get('/passwordless/verify', async (req, res, next) => {
  try {
    const schema = Joi.object({ link_token: Joi.string().required(), auth_request_id: Joi.string().optional() });
    const { value, error } = schema.validate(req.query);
    if (error) throw new AppError('Validation error', 400, error.details);
    let user, verifyResponse;
    try {
      ({ user, verifyResponse } = await verifyWithLink(value.link_token, value.auth_request_id));
    } catch (e) {
      const msg = (e && e.details && e.details.sdkError) || e.message || '';
      // Retry without auth_request_id if provided one appears expired or invalid
      if (value.auth_request_id && /auth request expired/i.test(msg)) {
        ({ user, verifyResponse } = await verifyWithLink(value.link_token, undefined));
      } else {
        throw e;
      }
    }
    req.session.user = user;
  const token = env.JWT_ENABLED ? jwt.sign({ sub: user.id, email: user.email }, env.JWT_SECRET, { expiresIn: '4h' }) : undefined;
  res.json({ user, token, verify: verifyResponse });
  } catch (err) {
    next(err);
  }
});

// Logout endpoint (needs active session)
router.post('/logout', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: 'Failed to destroy session' });
    res.clearCookie('sid');
    res.json({ success: true });
  });
});

module.exports = router;
