/**
 * Asynchronous handler wrapper to catch and forward errors to centralized Express error middleware
 * @param {Function} fn - Asynchronous controller function
 * @returns {Function} Express middleware function
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = asyncHandler;
