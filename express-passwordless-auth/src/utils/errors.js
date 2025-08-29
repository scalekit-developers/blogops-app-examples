class AppError extends Error {
  constructor(message, statusCode = 500, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

const notFound = (req, res, next) => {
  next(new AppError('Not Found', 404));
};

// Centralized error handler (Requirement 6)
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const status = err.statusCode || 500;
  const isProd = req.app.get('env') === 'production';
  const payload = {
    error: err.message || 'Internal Server Error',
  };
  if (err.details) payload.details = err.details;
  if (!isProd && err.stack) payload.stack = err.stack;
  res.status(status).json(payload);
};

module.exports = { AppError, notFound, errorHandler };
