const express = require('express');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const { httpLogger } = require('./utils/logger');
const { securityMiddleware } = require('./middleware/security');
const { corsMiddleware } = require('./middleware/cors');
const { sessionMiddleware } = require('./middleware/session');
const { globalLimiter } = require('./middleware/rateLimits');
const { notFound, errorHandler } = require('./utils/errors');

// Routes
const authRoutes = require('./routes/auth');
const utilityRoutes = require('./routes/health');

// Swagger
const swaggerUi = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc');

const app = express();

// Express settings
app.set('env', env.NODE_ENV);

// Core middleware
// Attach lightweight request id
app.use((req, res, next) => { req.id = Math.random().toString(36).slice(2, 10); next(); });
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
securityMiddleware(app);
corsMiddleware(app);
sessionMiddleware(app);
app.use(httpLogger);
app.use(globalLimiter);

// Swagger setup (Requirement: Swagger UI for API testing)
let openapiDefinition;
try {
  openapiDefinition = require('./docs/openapi.json');
} catch (e) {
  openapiDefinition = { openapi: '3.0.3', info: { title: 'Spec pending generation', version: '0.0.0' } };
}
const swaggerSpec = swaggerJSDoc({ definition: openapiDefinition, apis: [] });
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API prefix
app.use('/api/auth', authRoutes);
app.use('/api', utilityRoutes);

// Root info route (avoid 404 noise on /)
app.get('/', (req, res) => {
  res.json({
    name: 'Scalekit Passwordless Sample',
    docs: '/docs',
    health: '/api/health',
    auth: {
  send: '/api/auth/passwordless/email/send',
      verifyCode: '/api/auth/passwordless/email/verify/code',
      verifyLink: '/api/auth/passwordless/verify'
    }
  });
});

// 404 + errors
app.use(notFound);
app.use(errorHandler);

module.exports = app;
