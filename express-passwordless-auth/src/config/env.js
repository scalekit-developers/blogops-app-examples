const dotenv = require('dotenv');
const Joi = require('joi');
const crypto = require('crypto');

dotenv.config();

// Minimal required env per latest request:
// - SCALEKIT_ENVIRONMENT_URL
// - SCALEKIT_CLIENT_ID
// - SCALEKIT_CLIENT_SECRET
// - JWT_SECRET (still required to issue demo JWTs)
// NEXT_PUBLIC_BASE_URL & SESSION_SECRET now optional (SESSION_SECRET auto-generated in non-production if omitted)

const schema = Joi.object({
  PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  SCALEKIT_ENVIRONMENT_URL: Joi.string().uri().required(),
  SCALEKIT_CLIENT_ID: Joi.string().required(),
  SCALEKIT_CLIENT_SECRET: Joi.string().required(),
  // SESSION_SECRET optional; we will inject one if missing (only allowed outside production)
  SESSION_SECRET: Joi.string().min(12).optional(),
  JWT_SECRET: Joi.string().min(12).required(),
  JWT_ENABLED: Joi.boolean().truthy('true').falsy('false').default(true),
  NEXT_PUBLIC_BASE_URL: Joi.string().uri().optional(),
  CORS_ALLOWED_ORIGINS: Joi.string().allow(''),
  RATE_LIMIT_WINDOW_MS: Joi.number().default(60000),
  RATE_LIMIT_MAX: Joi.number().default(60),
  RATE_LIMIT_AUTH_EMAIL_MAX: Joi.number().default(2),
  RATE_LIMIT_AUTH_EMAIL_WINDOW_MS: Joi.number().default(60000),
  PASSWORDLESS_MAGICLINK_URI_OVERRIDE: Joi.string().uri().optional(),
  LOG_FORMAT: Joi.string().valid('text', 'json').default('text'),
  LOG_LEVEL: Joi.string().valid('info', 'error').default('info')
}).unknown();

let { value: env, error } = schema.validate(process.env, { abortEarly: false });
if (error) {
  console.error('Environment validation error:', error.details.map(d => d.message).join(', '));
  process.exit(1);
}

// Auto-generate a session secret if not provided (development/test only)
if (!env.SESSION_SECRET) {
  if (env.NODE_ENV === 'production') {
    console.error('SESSION_SECRET is required in production. Set it in your environment.');
    process.exit(1);
  }
  env.SESSION_SECRET = crypto.randomBytes(24).toString('hex');
  // eslint-disable-next-line no-console
  console.warn('[env] SESSION_SECRET not provided. Generated ephemeral secret for this run. DO NOT use in production.');
}

env.CORS_ALLOWED_ORIGINS_ARRAY = (env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

module.exports = env;
