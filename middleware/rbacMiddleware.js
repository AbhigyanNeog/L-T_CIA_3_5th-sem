const User = require('../models/User');
const LeaveRequest = require('../models/LeaveRequest');
const AppError = require('../utils/appError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Reusable Role-Based Authorization Middleware
 * Verifies that authenticated user possesses at least one of the permitted roles.
 * @param  {...string} roles - Allowed roles ('hr_admin', 'manager', 'employee')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required. Please log in first.', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `Forbidden: Role '${req.user.role}' is not authorized to access this resource.`,
          403
        )
      );
    }

    next();
  };
};

/**
 * Convenience role guards
 */
const requireAdmin = authorize('hr_admin');
const requireManagerOrAdmin = authorize('manager', 'hr_admin');
const requireEmployee = authorize('employee');

/**
 * Resource Ownership Guard: Profile Access
 * Ensures an employee can only view or edit their own profile,
 * while allowing HR Admin or the direct reporting manager access.
 */
const checkProfileOwnership = asyncHandler(async (req, res, next) => {
  const targetId = req.params.id;

  if (!req.user) {
    return next(new AppError('Authentication required.', 401));
  }

  // 1. HR Admin has organization-wide access
  if (req.user.role === 'hr_admin') {
    return next();
  }

  // 2. Employee accessing their own profile
  if (req.user._id.toString() === targetId) {
    return next();
  }

  // 3. Manager accessing a direct report's profile
  if (req.user.role === 'manager') {
    const targetEmployee = await User.findById(targetId);
    if (!targetEmployee) {
      return next(new AppError('Target employee not found.', 404));
    }

    const managerRef = targetEmployee.managerId || targetEmployee.reportsTo;
    if (managerRef && managerRef.toString() === req.user._id.toString()) {
      return next();
    }
  }

  return next(
    new AppError('Forbidden: You do not have permission to view or modify another employee’s profile.', 403)
  );
});

/**
 * Business Rule Guard: Leave Approval Authority
 * 1. An employee must NOT approve their own leave request.
 * 2. A manager can only approve leaves for employees in their direct team.
 * 3. HR Admin has supervisory override authority.
 */
const checkLeaveApprovalAuthority = asyncHandler(async (req, res, next) => {
  const leaveId = req.params.id;

  const leave = await LeaveRequest.findById(leaveId).populate('employeeId');
  if (!leave) {
    return next(new AppError('Leave request not found.', 404));
  }

  const applicant = leave.employeeId;
  if (!applicant) {
    return next(new AppError('Leave applicant record could not be resolved.', 404));
  }

  // Rule 1: An employee must NOT approve their own leave
  if (applicant._id.toString() === req.user._id.toString()) {
    return next(
      new AppError('Forbidden: Employees are not permitted to approve or reject their own leave requests.', 403)
    );
  }

  // Rule 2: HR Admin has full approval rights
  if (req.user.role === 'hr_admin') {
    req.leaveRequest = leave;
    return next();
  }

  // Rule 3: Manager can only approve requests from direct reports
  if (req.user.role === 'manager') {
    const managerRef = applicant.managerId || applicant.reportsTo;
    if (managerRef && managerRef.toString() === req.user._id.toString()) {
      req.leaveRequest = leave;
      return next();
    }

    return next(
      new AppError('Forbidden: Managers can only approve leave requests belonging to employees in their assigned team.', 403)
    );
  }

  return next(new AppError('Forbidden: You do not have authority to approve or reject leave requests.', 403));
});

module.exports = {
  authorize,
  requireAdmin,
  requireManagerOrAdmin,
  requireEmployee,
  checkProfileOwnership,
  checkLeaveApprovalAuthority
};
