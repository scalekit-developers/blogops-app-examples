const helmet = require('helmet');
const compression = require('compression');

// Consolidate security related middleware (Requirement 7)
function securityMiddleware(app) {
  app.use(helmet({
    crossOriginEmbedderPolicy: false,
  }));
  app.use(compression());
}

module.exports = { securityMiddleware };
