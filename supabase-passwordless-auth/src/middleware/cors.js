const cors = require('cors');
const env = require('../config/env');

function corsMiddleware(app) {
  const whitelist = env.CORS_ALLOWED_ORIGINS_ARRAY;
  app.use(cors({
    origin: (origin, cb) => {
      if (!origin || whitelist.length === 0 || whitelist.includes(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }));
}

module.exports = { corsMiddleware };
