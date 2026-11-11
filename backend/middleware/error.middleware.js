function errorHandler(err, req, res, next) {
  const isProd = process.env.NODE_ENV === "production";
  
  // Safely log on server without leaking user secrets
  console.error(" Centralized API Error:", isProd ? (err.message || err) : (err.stack || err.message || err));

  // Safely handle body-parser / express.json SyntaxError (malformed JSON payloads)
  if (err instanceof SyntaxError && (err.status === 400 || err.statusCode === 400) && "body" in err) {
    return res.status(400).json({
      success: false,
      code: "BAD_REQUEST_MALFORMED_JSON",
      message: "Malformed JSON payload in request body."
    });
  }

  // Handle CORS rejection
  if (err.message && err.message.startsWith("CORS blocked")) {
    return res.status(403).json({
      success: false,
      code: "CORS_FORBIDDEN",
      message: err.message
    });
  }

  const statusCode = err.statusCode || err.status || (res.statusCode >= 400 ? res.statusCode : 500);
  const userMessage = isProd && statusCode === 500
    ? "An unexpected internal server error occurred. Please try again later."
    : (err.message || "An internal server error occurred");

  return res.status(statusCode).json({
    success: false,
    code: err.code || (statusCode === 404 ? "NOT_FOUND" : statusCode === 400 ? "BAD_REQUEST" : "INTERNAL_ERROR"),
    message: userMessage,
    ...(req.headers["x-request-id"] && { requestId: req.headers["x-request-id"] }),
    ...(!isProd && { stack: err.stack })
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
