const { ZodError } = require('zod');

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      message: 'Validation error',
      details: err.errors,
    });
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  return res.status(status).json({ message });
};

module.exports = errorHandler;
