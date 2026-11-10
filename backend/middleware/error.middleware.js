function errorHandler(err, req, res, next) {
  console.error(" Centralized API Error:", err.stack || err.message || err);

  // Safely handle body-parser / express.json SyntaxError (malformed JSON payloads)
  if (err instanceof SyntaxError && (err.status === 400 || err.statusCode === 400) && "body" in err) {
    return res.status(400).json({
      success: false,
      message: "Malformed JSON payload in request body."
    });
  }

  const statusCode = err.statusCode || err.status || (res.statusCode === 200 ? 500 : res.statusCode);
  return res.status(statusCode).json({
    success: false,
    message: err.message || "An internal server error occurred",
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack })
  });
}

function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    message: `Resource not found on endpoint: ${req.method} ${req.originalUrl}`
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};
