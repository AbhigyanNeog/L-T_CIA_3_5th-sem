/**
 * Custom Operational Error Class for structured error handling
 */
class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {number} statusCode - HTTP status code (e.g. 400, 401, 403, 404, 409, 500)
   * @param {Array|null} errors - Specific validation or field-level errors
   */
  constructor(message, statusCode, errors = null, errorCode = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.errors = errors;
    this.errorCode = errorCode;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
