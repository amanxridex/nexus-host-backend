const errorMiddleware = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Handle specific errors
  if (err.code === '23505') { // Unique violation
    statusCode = 409;
    message = 'Email already registered';
  }

  if (err.code === '22P02') { // Invalid UUID
    statusCode = 400;
    message = 'Invalid ID format';
  }

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorMiddleware;