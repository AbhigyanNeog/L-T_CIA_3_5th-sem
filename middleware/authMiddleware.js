const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/appError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Authentication Middleware: Verifies JWT access token and binds authenticated user to request
 */
const authenticate = asyncHandler(async (req, res, next) => {
  let token;

  // Extract token from Bearer header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(
      new AppError('Authentication required. Missing Bearer authorization token.', 401)
    );
  }

  // Verify token signature against JWT_SECRET from .env
  if (!process.env.JWT_SECRET) {
    return next(new AppError('Server configuration error: JWT_SECRET is not set.', 500));
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  // Retrieve user record from database
  const currentUser = await User.findById(decoded.id)
    .populate('departmentId', 'name code')
    .populate('designationId', 'title level')
    .populate('managerId', 'name email employeeId');

  if (!currentUser) {
    return next(
      new AppError('Unauthorized: The user belonging to this token no longer exists.', 401)
    );
  }

  // Verify account is in active status
  if (currentUser.status !== 'active') {
    return next(
      new AppError(
        'Forbidden: Your account has been deactivated or terminated. Please contact HR.',
        403
      )
    );
  }

  // Attach authenticated user to request context
  req.user = currentUser;
  next();
});

module.exports = {
  authenticate
};
