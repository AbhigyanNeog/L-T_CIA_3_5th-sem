/**
 * Standardized API Response Utilities
 */
class ApiResponse {
  /**
   * Send a successful JSON response
   * @param {Object} res - Express response object
   * @param {number} statusCode - HTTP status code (default: 200)
   * @param {string} message - Success message
   * @param {Object|Array|null} data - Payload data
   * @param {Object|null} meta - Optional pagination / metadata
   */
  static success(res, statusCode = 200, message = 'Success', data = null, meta = null) {
    const responsePayload = {
      success: true,
      message
    };

    if (data !== null) {
      responsePayload.data = data;
    }

    if (meta !== null) {
      responsePayload.meta = meta;
    }

    return res.status(statusCode).json(responsePayload);
  }

  /**
   * Send a structured error JSON response
   * @param {Object} res - Express response object
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Error message
   * @param {Array|null} errors - Array of specific error details
   * @param {string|null} errorCode - Standardized machine-readable error code
   */
  static error(res, statusCode = 500, message = 'An unexpected error occurred', errors = null, errorCode = null) {
    const defaultErrorCode = {
      400: 'VALIDATION_ERROR',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR'
    }[statusCode] || 'INTERNAL_SERVER_ERROR';

    const responsePayload = {
      success: false,
      message,
      errorCode: errorCode || defaultErrorCode
    };

    if (errors !== null && errors !== undefined) {
      responsePayload.errors = errors;
    }

    return res.status(statusCode).json(responsePayload);
  }
}

module.exports = ApiResponse;
