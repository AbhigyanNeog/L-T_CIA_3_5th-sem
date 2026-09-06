const User = require('../models/User');
const AppError = require('../utils/appError');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Authenticate employee & return JWT token
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide both email and password.', 400));
  }

  // Find user by email and explicitly select password hash
  const user = await User.findOne({ email: email.toLowerCase() })
    .select('+password')
    .populate('department', 'name code')
    .populate('designation', 'title level');

  if (!user || !(await user.comparePassword(password))) {
    return next(new AppError('Invalid email or password.', 401));
  }

  if (user.status !== 'active') {
    return next(
      new AppError('Your account has been deactivated or terminated. Please contact HR.', 403)
    );
  }

  // Generate JWT access token
  const token = user.generateAuthToken();

  // Exclude password from response payload
  user.password = undefined;

  return ApiResponse.success(res, 200, 'Authentication successful.', {
    token,
    user
  });
});

/**
 * @desc    Get currently authenticated user's profile
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('department', 'name code headOfDepartment')
    .populate('designation', 'title level minSalary maxSalary')
    .populate('reportsTo', 'firstName lastName employeeId email');

  return ApiResponse.success(res, 200, 'User profile retrieved successfully.', {
    user
  });
});

/**
 * @desc    Change password for authenticated user
 * @route   POST /api/v1/auth/change-password
 * @access  Private
 */
const changePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return next(new AppError('Please provide both current and new passwords.', 400));
  }

  if (newPassword.length < 6) {
    return next(new AppError('New password must be at least 6 characters long.', 400));
  }

  const user = await User.findById(req.user._id).select('+password');

  if (!(await user.comparePassword(currentPassword))) {
    return next(new AppError('Current password is incorrect.', 401));
  }

  // Set new password (pre-save hook will hash it)
  user.password = newPassword;
  await user.save();

  return ApiResponse.success(res, 200, 'Password updated successfully. Please use your new password next time you log in.');
});

module.exports = {
  login,
  getMe,
  changePassword
};
