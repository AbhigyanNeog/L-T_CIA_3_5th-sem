const AppError = require('../utils/appError');
const ApiResponse = require('../utils/apiResponse');

/**
 * 404 Not Found Middleware for unhandled endpoints
 */
const notFoundHandler = (req, res, next) => {
  next(new AppError(`Resource not found: ${req.method} ${req.originalUrl}`, 404, null, 'NOT_FOUND'));
};

/**
 * Centralized Global Error Handling Middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;
  error.errorCode = err.errorCode;

  // Log error in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    console.error('[Centralized Error Handler]:', err.name || 'Error', err.message);
  }

  // 1. Mongoose Bad ObjectId / CastError (Handles invalid ObjectIds safely)
  if (err.name === 'CastError') {
    const isObjectId = err.kind === 'ObjectId' || err.path.toLowerCase().endsWith('id');
    const message = isObjectId
      ? `Invalid ObjectId format for parameter '${err.path}': '${err.value}'. Must be a valid 24-character hex string.`
      : `Invalid value '${err.value}' for field '${err.path}'.`;
    error = new AppError(message, 400, null, 'INVALID_ID');
  }

  // 2. Mongoose Duplicate Key Error (code 11000)
  if (err.code === 11000) {
    const duplicateFields = Object.keys(err.keyValue || {}).join(', ');
    const duplicateValues = Object.values(err.keyValue || {}).join(', ');
    const message = `Duplicate record conflict: A record with ${duplicateFields} '${duplicateValues}' already exists.`;
    error = new AppError(message, 409, null, 'DUPLICATE_RECORD');
  }

  // 3. Mongoose Schema Validation Error (Handles invalid enums, required fields, date formats)
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((val) => {
      let msg = val.message;
      if (val.kind === 'enum') {
        msg = `'${val.value}' is not a valid option for '${val.path}'. Permitted values: ${val.properties ? val.properties.enumValues.join(', ') : 'valid enum choices'}.`;
      }
      return {
        field: val.path,
        message: msg,
        value: val.value
      };
    });
    const message = errors.map((e) => e.message).join('; ') || 'Validation failed on input payload.';
    error = new AppError(message, 400, errors, 'VALIDATION_ERROR');
  }

  // 4. JWT Errors
  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Invalid authentication token. Authorization failed.', 401, null, 'UNAUTHORIZED');
  }

  if (err.name === 'TokenExpiredError') {
    error = new AppError('Authentication token has expired. Please log in again.', 401, null, 'TOKEN_EXPIRED');
  }

  // 5. Express JSON Syntax Error in request body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    error = new AppError('Malformed JSON payload received. Please check JSON syntax.', 400, null, 'MALFORMED_JSON');
  }

  return ApiResponse.error(
    res,
    error.statusCode || 500,
    error.message || 'Internal Server Error',
    error.errors || null,
    error.errorCode || null
  );
};

module.exports = {
  notFoundHandler,
  errorHandler
};
