function errorHandler(err, _req, res, _next) {
  console.error('Unhandled error:', err);
  const response = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
    },
  };
  res.status(500).json(response);
}

module.exports = { errorHandler };
