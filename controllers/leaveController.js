const LeaveRequest = require('../models/LeaveRequest');
const LeaveType = require('../models/LeaveType');
const LeaveBalance = require('../models/LeaveBalance');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const AppError = require('../utils/appError');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { calculateWorkingDays, toMidnightUTC } = require('../utils/leaveCalculator');
const { provisionEmployeeBalances } = require('./leaveBalanceController');

/**
 * @desc    Submit a new leave application
 * @route   POST /api/v1/leaves/apply
 * @access  Private (All authenticated employees)
 */
const applyLeave = asyncHandler(async (req, res, next) => {
  const { leaveTypeId, type, startDate, fromDate, endDate, toDate, reason } = req.body;

  const startRaw = fromDate || startDate;
  const endRaw = toDate || endDate;

  if (!startRaw || !endRaw) {
    return next(new AppError('Both start date (fromDate) and end date (toDate) are required.', 400));
  }

  const start = toMidnightUTC(startRaw);
  const end = toMidnightUTC(endRaw);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return next(new AppError('Invalid date format provided.', 400));
  }

  if (start > end) {
    return next(new AppError('Start date cannot be after end date.', 400));
  }

  // Resolve LeaveType by ID or type name/code
  let leaveType = null;
  if (leaveTypeId) {
    leaveType = await LeaveType.findById(leaveTypeId);
  }
  if (!leaveType && (type || leaveTypeId)) {
    const searchVal = type || leaveTypeId;
    leaveType = await LeaveType.findOne({
      $or: [
        { code: new RegExp(`^${searchVal}$`, 'i') },
        { name: new RegExp(`^${searchVal}$`, 'i') }
      ]
    });
  }

  if (!leaveType && !type) {
    return next(new AppError('Please specify a valid leave type.', 400));
  }

  // Calculate actual working days excluding weekends and company holidays
  const { netWorkingDays, holidaysEncountered } = await calculateWorkingDays(start, end);

  if (netWorkingDays === 0) {
    return next(
      new AppError(
        'The selected date range consists entirely of non-working days or holidays. No leave days are required.',
        400
      )
    );
  }

  // Collision Guard: Ensure no overlapping PENDING or APPROVED leaves
  const overlapping = await LeaveRequest.findOne({
    employeeId: req.user._id,
    status: { $in: ['PENDING', 'APPROVED'] },
    $or: [
      { fromDate: { $lte: end }, toDate: { $gte: start } },
      { startDate: { $lte: end }, endDate: { $gte: start } }
    ]
  });

  if (overlapping) {
    return next(
      new AppError(
        `You already have an active (${overlapping.status}) leave application overlapping with the requested period.`,
        409
      )
    );
  }

  // Determine type string ('CASUAL', 'SICK', 'EARNED', 'UNPAID')
  let leaveTypeString = 'CASUAL';
  if (type) {
    leaveTypeString = type.toUpperCase();
  } else if (leaveType) {
    if (['CL', 'CASUAL'].includes(leaveType.code)) leaveTypeString = 'CASUAL';
    else if (['SL', 'SICK'].includes(leaveType.code)) leaveTypeString = 'SICK';
    else if (['EL', 'PL', 'EARNED'].includes(leaveType.code)) leaveTypeString = 'EARNED';
    else if (['LOP', 'UNPAID'].includes(leaveType.code)) leaveTypeString = 'UNPAID';
    else leaveTypeString = leaveType.name.toUpperCase();
  }

  // Check Leave Balance
  const leaveYear = start.getUTCFullYear();
  const categoryKey = leaveTypeString.toLowerCase(); // 'casual', 'sick', 'earned'

  let balance = await LeaveBalance.findOne({
    employeeId: req.user._id,
    year: leaveYear
  });

  if (balance && balance[categoryKey] && leaveTypeString !== 'UNPAID') {
    const remaining = balance[categoryKey].remaining;
    if (remaining < netWorkingDays) {
      return next(
        new AppError(
          `Insufficient leave balance. You have ${remaining} day(s) remaining for ${leaveTypeString}, but requested ${netWorkingDays} day(s).`,
          400
        )
      );
    }
  }

  // Create Leave Application
  const leaveRequest = await LeaveRequest.create({
    employeeId: req.user._id,
    type: leaveTypeString,
    leaveType: leaveType ? leaveType._id : undefined,
    fromDate: start,
    toDate: end,
    startDate: start,
    endDate: end,
    totalDays: netWorkingDays,
    reason,
    status: 'PENDING'
  });

  const populated = await LeaveRequest.findById(leaveRequest._id)
    .populate('leaveType', 'name code isPaid')
    .populate('employeeId', 'name employeeId email departmentId');

  return ApiResponse.success(res, 201, 'Leave application submitted successfully.', {
    leaveRequest: populated,
    netWorkingDays,
    holidaysEncounteredCount: holidaysEncountered.length
  });
});

/**
 * @desc    Get authenticated employee's leave applications
 * @route   GET /api/v1/leaves/me
 * @access  Private
 */
const getMyLeaves = asyncHandler(async (req, res) => {
  const { status, year, page = 1, limit = 20 } = req.query;
  const filter = { employee: req.user._id };

  if (status) filter.status = status.toUpperCase();
  if (year) {
    const startYear = new Date(Date.UTC(Number(year), 0, 1));
    const endYear = new Date(Date.UTC(Number(year), 11, 31, 23, 59, 59, 999));
    filter.startDate = { $gte: startYear, $lte: endYear };
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, parseInt(limit, 10));
  const skip = (pageNum - 1) * limitNum;

  const [leaves, total] = await Promise.all([
    LeaveRequest.find(filter)
      .populate('leaveType', 'name code isPaid')
      .populate('reviewedBy', 'firstName lastName employeeId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    LeaveRequest.countDocuments(filter)
  ]);

  return ApiResponse.success(res, 200, 'My leave applications retrieved.', {
    leaves,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum)
    }
  });
});

/**
 * @desc    Cancel a pending or future approved leave
 * @route   PATCH /api/v1/leaves/:id/cancel
 * @access  Private (Owner Employee, HR Admin)
 */
const cancelLeave = asyncHandler(async (req, res, next) => {
  const leave = await LeaveRequest.findById(req.params.id).populate('leaveType');
  if (!leave) {
    return next(new AppError('Leave request not found.', 404));
  }

  const isOwner = leave.employee.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'hr_admin';

  if (!isOwner && !isAdmin) {
    return next(new AppError('Forbidden: You can only cancel your own leave requests.', 403));
  }

  if (leave.status === 'CANCELLED' || leave.status === 'REJECTED') {
    return next(new AppError(`Cannot cancel a leave that is already ${leave.status}.`, 400));
  }

  const leaveYear = leave.startDate.getUTCFullYear();
  const balance = await LeaveBalance.findOne({
    employee: leave.employee,
    leaveType: leave.leaveType._id,
    year: leaveYear
  });

  if (leave.status === 'PENDING') {
    leave.status = 'CANCELLED';
    if (balance) {
      balance.pendingDays = Math.max(0, balance.pendingDays - leave.totalDays);
      await balance.save();
    }
  } else if (leave.status === 'APPROVED') {
    leave.status = 'CANCELLED';
    if (balance) {
      balance.usedDays = Math.max(0, balance.usedDays - leave.totalDays);
      balance.remainingDays = Math.max(0, balance.allocatedDays - balance.usedDays);
      await balance.save();
    }

    // Remove 'ON_LEAVE' attendance records generated for this leave span
    await Attendance.deleteMany({
      employee: leave.employee,
      date: { $gte: leave.startDate, $lte: leave.endDate },
      status: 'ON_LEAVE'
    });
  }

  await leave.save();

  return ApiResponse.success(res, 200, 'Leave application cancelled successfully.', {
    leave
  });
});

/**
 * @desc    Get pending leave requests for Manager's direct reports or HR Admin
 * @route   GET /api/v1/leaves/pending
 * @access  Private (Manager, HR Admin)
 */
const getPendingLeaves = asyncHandler(async (req, res) => {
  const filter = { status: 'PENDING' };

  if (req.user.role === 'manager') {
    const directReports = await User.find({ reportsTo: req.user._id }).select('_id');
    const reportIds = directReports.map((r) => r._id);
    filter.employee = { $in: reportIds };
  }

  const pendingLeaves = await LeaveRequest.find(filter)
    .populate('employee', 'firstName lastName employeeId email department designation')
    .populate({
      path: 'employee',
      populate: [
        { path: 'department', select: 'name code' },
        { path: 'designation', select: 'title level' }
      ]
    })
    .populate('leaveType', 'name code isPaid')
    .sort({ createdAt: 1 });

  return ApiResponse.success(res, 200, 'Pending leave requests retrieved.', {
    count: pendingLeaves.length,
    leaves: pendingLeaves
  });
});

/**
 * @desc    Approve or reject a leave request
 * @route   PATCH /api/v1/leaves/:id/status
 * @access  Private (Reporting Manager, HR Admin)
 */
const updateLeaveStatus = asyncHandler(async (req, res, next) => {
  const { status, remarks, reviewRemarks } = req.body;

  if (!['APPROVED', 'REJECTED'].includes(status)) {
    return next(new AppError("Status must be either 'APPROVED' or 'REJECTED'.", 400));
  }

  const leave = await LeaveRequest.findById(req.params.id)
    .populate('employeeId')
    .populate('employee')
    .populate('leaveType');

  if (!leave) {
    return next(new AppError('Leave request not found.', 404));
  }

  // Business Rule: Already approved/rejected requests cannot be processed again
  if (leave.status !== 'PENDING') {
    return next(
      new AppError(
        `Cannot update a leave request that is already ${leave.status}. Already processed requests cannot be processed again.`,
        400
      )
    );
  }

  const applicant = leave.employeeId || leave.employee;
  if (!applicant) {
    return next(new AppError('Applicant record could not be resolved.', 404));
  }

  // Business Rule: Employee cannot approve own request
  if (applicant._id.toString() === req.user._id.toString()) {
    return next(
      new AppError('Forbidden: Employees are not permitted to approve or reject their own leave requests.', 403)
    );
  }

  // Business Rule: Only direct reporting manager or HR Admin can review
  const managerRef = applicant.managerId || applicant.reportsTo;
  const isDirectManager =
    req.user.role === 'manager' &&
    managerRef &&
    managerRef.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'hr_admin';

  if (!isDirectManager && !isAdmin) {
    return next(
      new AppError('Forbidden: Only the assigned reporting manager or HR Admin can review this leave request.', 403)
    );
  }

  const startDate = leave.fromDate || leave.startDate;
  const endDate = leave.toDate || leave.endDate;
  const leaveYear = startDate.getUTCFullYear();
  const finalRemarks = remarks || reviewRemarks || (status === 'APPROVED' ? 'Approved' : 'Rejected');

  // Balance ledgers
  const categoryKey = (leave.type || '').toLowerCase();
  const [balance, embeddedBalance] = await Promise.all([
    LeaveBalance.findOne({
      employee: applicant._id,
      leaveType: leave.leaveType ? leave.leaveType._id : undefined,
      year: leaveYear
    }),
    LeaveBalance.findOne({
      employeeId: applicant._id,
      year: leaveYear
    })
  ]);

  if (status === 'APPROVED') {
    leave.status = 'APPROVED';
    leave.approverId = req.user._id;
    leave.reviewedBy = req.user._id;
    leave.reviewedAt = new Date();
    leave.remarks = finalRemarks;
    leave.reviewRemarks = finalRemarks;

    if (balance) {
      balance.pendingDays = Math.max(0, (balance.pendingDays || 0) - leave.totalDays);
      balance.usedDays = (balance.usedDays || 0) + leave.totalDays;
      balance.remainingDays = Math.max(0, (balance.allocatedDays || 0) - balance.usedDays);
      await balance.save();
    }

    if (embeddedBalance && embeddedBalance[categoryKey]) {
      embeddedBalance[categoryKey].used = (embeddedBalance[categoryKey].used || 0) + leave.totalDays;
      embeddedBalance[categoryKey].remaining = Math.max(
        0,
        (embeddedBalance[categoryKey].allocated || 0) - embeddedBalance[categoryKey].used
      );
      await embeddedBalance.save();
    }

    // Auto-create/update Attendance records as ON_LEAVE for working days
    const current = new Date(startDate);
    while (current <= endDate) {
      const dayOfWeek = current.getUTCDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        await Attendance.findOneAndUpdate(
          { employeeId: applicant._id, date: new Date(current) },
          {
            employeeId: applicant._id,
            employee: applicant._id,
            date: new Date(current),
            status: 'ON_LEAVE',
            notes: `Approved Leave: ${leave.type || (leave.leaveType ? leave.leaveType.name : 'Leave')}`
          },
          { upsert: true, new: true }
        );
      }
      current.setUTCDate(current.getUTCDate() + 1);
    }
  } else {
    // REJECTED
    leave.status = 'REJECTED';
    leave.approverId = req.user._id;
    leave.reviewedBy = req.user._id;
    leave.reviewedAt = new Date();
    leave.remarks = finalRemarks;
    leave.reviewRemarks = finalRemarks;

    if (balance) {
      balance.pendingDays = Math.max(0, (balance.pendingDays || 0) - leave.totalDays);
      await balance.save();
    }
  }

  await leave.save();

  const populated = await LeaveRequest.findById(leave._id)
    .populate('leaveType', 'name code isPaid')
    .populate('employeeId', 'name employeeId email')
    .populate('approverId', 'name employeeId email');

  return ApiResponse.success(res, 200, `Leave request has been ${status.toLowerCase()}.`, {
    leave: populated
  });
});

/**
 * @desc    Get all company leave requests (HR Admin)
 * @route   GET /api/v1/leaves
 * @access  Private (HR Admin)
 */
const getAllLeaves = asyncHandler(async (req, res) => {
  const { department, status, leaveType, year, page = 1, limit = 50 } = req.query;
  const filter = {};

  if (status) filter.status = status.toUpperCase();
  if (leaveType) filter.leaveType = leaveType;

  if (year) {
    const startYear = new Date(Date.UTC(Number(year), 0, 1));
    const endYear = new Date(Date.UTC(Number(year), 11, 31, 23, 59, 59, 999));
    filter.startDate = { $gte: startYear, $lte: endYear };
  }

  if (department) {
    const deptEmployees = await User.find({ department }).select('_id');
    const empIds = deptEmployees.map((e) => e._id);
    filter.employee = { $in: empIds };
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, parseInt(limit, 10));
  const skip = (pageNum - 1) * limitNum;

  const [leaves, total] = await Promise.all([
    LeaveRequest.find(filter)
      .populate('employee', 'firstName lastName employeeId department designation')
      .populate({
        path: 'employee',
        populate: [
          { path: 'department', select: 'name code' },
          { path: 'designation', select: 'title level' }
        ]
      })
      .populate('leaveType', 'name code isPaid')
      .populate('reviewedBy', 'firstName lastName employeeId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    LeaveRequest.countDocuments(filter)
  ]);

  return ApiResponse.success(res, 200, 'All leave requests retrieved.', {
    leaves,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum)
    }
  });
});

module.exports = {
  applyLeave,
  getMyLeaves,
  cancelLeave,
  getPendingLeaves,
  updateLeaveStatus,
  getAllLeaves
};
