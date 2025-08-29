const session = require('express-session');
const env = require('../config/env');

let RedisStore, redisClient;
if (process.env.REDIS_URL) {
  try {
    // Lazy require only if available
    const Redis = require('ioredis');
    const connectRedis = require('connect-redis').default || require('connect-redis');
    redisClient = new Redis(process.env.REDIS_URL);
    RedisStore = connectRedis(session);
  } catch (e) {
    console.warn('[session] REDIS_URL provided but redis dependencies not installed. Falling back to memory store.');
  }
}

// Session storage (Requirement 4)
// Using in-memory store for sample only (NOT for production). In production use connect-redis / connect-mongo etc.
function sessionMiddleware(app) {
  const store = RedisStore && redisClient ? new RedisStore({ client: redisClient, disableTTL: false, prefix: 'sess:' }) : undefined;
  app.use(session({
    name: 'sid',
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store,
    cookie: {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 4, // 4h
    },
  }));
  if (store) console.log('[session] Using Redis session store');
}

module.exports = { sessionMiddleware };
