const { resError } = require("../utils/responseUtil");

function notFoundMiddleware(req, res, next) {
  return resError(res, `Route not found: ${req.originalUrl}`, 404);
}

function errorMiddleware(err, req, res, next) {
  console.error("Server Error:", err);

  if (err.name === "SequelizeValidationError") {
    const errors = err.errors.map((error) => error.message);
    return resError(res, errors, 400);
  }

  if (err.name === "SequelizeUniqueConstraintError") {
    const errors = err.errors.map((error) => error.message);
    return resError(res, errors, 409);
  }

  if (err.name === "SequelizeForeignKeyConstraintError") {
    return resError(res, "Invalid related record provided.", 400);
  }

  if (err.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      return resError(res, "File size must not exceed 5MB.", 400);
    }

    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return resError(res, "Unexpected file field provided.", 400);
    }

    return resError(res, err.message || "File upload error.", 400);
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || "Internal server error.";

  return resError(res, message, statusCode);
}

module.exports = {
  notFoundMiddleware,
  errorMiddleware,
};
