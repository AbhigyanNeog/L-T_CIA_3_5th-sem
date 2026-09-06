const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Holiday = require('../models/Holiday');
const AppError = require('../utils/appError');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Normalizes any Date object to midnight UTC for uniform calendar-day grouping
 */
const getMidnightUTC = (d = new Date()) => {
  const date = new Date(d);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

/**
 * @desc    Clock-in for today's work session
 * @route   POST /api/v1/attendance/clock-in
 * @access  Private (All authenticated employees)
 */
const clockIn = asyncHandler(async (req, res, next) => {
  const today = getMidnightUTC();
  const now = new Date();
  const clientIp = req.ip || req.connection.remoteAddress || '';

  // Check if attendance record already exists for today
  let record = await Attendance.findOne({
    employee: req.user._id,
    date: today
  });

  if (record && record.clockIn) {
    return next(
      new AppError(
        `Already clocked in today at ${new Date(record.clockIn).toLocaleTimeString()}.`,
        400
      )
    );
  }

  // Grace period evaluation: Standard shift 09:00 AM, grace cutoff 09:30 AM local
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const graceCutoffMinutes = 9 * 60 + 30; // 09:30 AM
  const isLate = currentMinutes > graceCutoffMinutes;

  if (record) {
    record.clockIn = now;
    record.status = isLate ? 'LATE' : 'PRESENT';
    record.ipAddress = clientIp;
    if (req.body.notes) record.notes = req.body.notes;
    await record.save();
  } else {
    record = await Attendance.create({
      employee: req.user._id,
      date: today,
      clockIn: now,
      status: isLate ? 'LATE' : 'PRESENT',
      ipAddress: clientIp,
      notes: req.body.notes || (isLate ? 'Late clock-in' : '')
    });
  }

  return ApiResponse.success(res, 200, 'Clock-in recorded successfully.', {
    attendance: record
  });
});

/**
 * @desc    Clock-out for today's work session & calculate work duration
 * @route   POST /api/v1/attendance/clock-out
 * @access  Private (All authenticated employees)
 */
const clockOut = asyncHandler(async (req, res, next) => {
  const today = getMidnightUTC();
  const now = new Date();

  const record = await Attendance.findOne({
    employee: req.user._id,
    date: today
  });

  if (!record || !record.clockIn) {
    return next(new AppError('No clock-in record found for today. Please clock in first.', 400));
  }

  if (record.clockOut) {
    return next(
      new AppError(
        `Already clocked out today at ${new Date(record.clockOut).toLocaleTimeString()}.`,
        400
      )
    );
  }

  record.clockOut = now;

  // Calculate duration in hours
  const diffMs = now - record.clockIn;
  const totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
  record.totalHours = totalHours;

  // Derive final daily status based on duration
  if (totalHours >= 8.0) {
    // Preserve LATE status note if arrived late, but mark as full present
    record.status = record.status === 'LATE' ? 'LATE' : 'PRESENT';
  } else if (totalHours >= 4.0) {
    record.status = 'HALF_DAY';
  } else {
    record.status = 'ABSENT';
  }

  if (req.body.notes) {
    record.notes = record.notes ? `${record.notes} | ${req.body.notes}` : req.body.notes;
  }

  await record.save();

  return ApiResponse.success(res, 200, 'Clock-out recorded successfully.', {
    attendance: record
  });
});

/**
 * @desc    Get authenticated employee's today status
 * @route   GET /api/v1/attendance/today
 * @access  Private
 */
const getMyTodayStatus = asyncHandler(async (req, res) => {
  const today = getMidnightUTC();

  const record = await Attendance.findOne({
    employee: req.user._id,
    date: today
  });

  return ApiResponse.success(res, 200, "Today's attendance status retrieved.", {
    attendance: record || null,
    isClockedIn: Boolean(record && record.clockIn && !record.clockOut),
    isCompleted: Boolean(record && record.clockIn && record.clockOut)
  });
});

/**
 * @desc    Get authenticated employee's attendance history
 * @route   GET /api/v1/attendance/me
 * @access  Private
 */
const getMyAttendance = asyncHandler(async (req, res) => {
  const { month, year, startDate, endDate, page = 1, limit = 31 } = req.query;
  const filter = { employee: req.user._id };

  if (startDate && endDate) {
    filter.date = {
      $gte: getMidnightUTC(startDate),
      $lte: getMidnightUTC(endDate)
    };
  } else if (month && year) {
    const startOfMonth = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
    const endOfMonth = new Date(Date.UTC(Number(year), Number(month), 0, 23, 59, 59, 999));
    filter.date = { $gte: startOfMonth, $lte: endOfMonth };
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, parseInt(limit, 10));
  const skip = (pageNum - 1) * limitNum;

  const [records, total] = await Promise.all([
    Attendance.find(filter).sort({ date: -1 }).skip(skip).limit(limitNum),
    Attendance.countDocuments(filter)
  ]);

  return ApiResponse.success(res, 200, 'Attendance history retrieved successfully.', {
    records,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum)
    }
  });
});

/**
 * @desc    Get all attendance records (HR Admin / Manager)
 * @route   GET /api/v1/attendance
 * @access  Private (HR Admin, Manager)
 */
const getAllAttendance = asyncHandler(async (req, res) => {
  const {
    employeeId,
    department,
    status,
    date,
    month,
    year,
    teamOnly,
    page = 1,
    limit = 50
  } = req.query;

  const filter = {};

  if (employeeId) {
    filter.employee = employeeId;
  }

  if (status) {
    filter.status = status.toUpperCase();
  }

  if (date) {
    filter.date = getMidnightUTC(date);
  } else if (month && year) {
    const startOfMonth = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
    const endOfMonth = new Date(Date.UTC(Number(year), Number(month), 0, 23, 59, 59, 999));
    filter.date = { $gte: startOfMonth, $lte: endOfMonth };
  }

  // Manager filter: Only direct reports
  if (req.user.role === 'manager' && teamOnly === 'true') {
    const teamMembers = await User.find({ reportsTo: req.user._id }).select('_id');
    const memberIds = teamMembers.map((m) => m._id);
    filter.employee = { $in: memberIds };
  } else if (department) {
    const deptEmployees = await User.find({ department }).select('_id');
    const empIds = deptEmployees.map((e) => e._id);
    filter.employee = { $in: empIds };
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, parseInt(limit, 10));
  const skip = (pageNum - 1) * limitNum;

  const [records, total] = await Promise.all([
    Attendance.find(filter)
      .populate('employee', 'firstName lastName employeeId email department designation')
      .populate({
        path: 'employee',
        populate: [
          { path: 'department', select: 'name code' },
          { path: 'designation', select: 'title level' }
        ]
      })
      .sort({ date: -1, clockIn: -1 })
      .skip(skip)
      .limit(limitNum),
    Attendance.countDocuments(filter)
  ]);

  return ApiResponse.success(res, 200, 'Attendance records retrieved successfully.', {
    records,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum)
    }
  });
});

/**
 * @desc    Regularize / adjust attendance record (HR Admin)
 * @route   POST /api/v1/attendance/regularize
 * @access  Private (HR Admin)
 */
const regularizeAttendance = asyncHandler(async (req, res, next) => {
  const { employeeId, date, clockIn, clockOut, status, reason } = req.body;

  if (!employeeId || !date || !status || !reason) {
    return next(new AppError('Employee, date, status, and reason are required for regularization.', 400));
  }

  const empUser = await User.findById(employeeId);
  if (!empUser) {
    return next(new AppError('Employee not found.', 404));
  }

  const targetDate = getMidnightUTC(date);

  let record = await Attendance.findOne({
    employee: employeeId,
    date: targetDate
  });

  const clockInDate = clockIn ? new Date(clockIn) : null;
  const clockOutDate = clockOut ? new Date(clockOut) : null;
  let totalHours = 0;

  if (clockInDate && clockOutDate) {
    totalHours = Math.round(((clockOutDate - clockInDate) / (1000 * 60 * 60)) * 100) / 100;
  } else if (status === 'PRESENT') {
    totalHours = 8.0;
  } else if (status === 'HALF_DAY') {
    totalHours = 4.0;
  }

  if (record) {
    record.clockIn = clockInDate || record.clockIn;
    record.clockOut = clockOutDate || record.clockOut;
    record.totalHours = totalHours;
    record.status = status;
    record.regularizedBy = req.user._id;
    record.regularizationReason = reason;
    await record.save();
  } else {
    record = await Attendance.create({
      employee: employeeId,
      date: targetDate,
      clockIn: clockInDate,
      clockOut: clockOutDate,
      totalHours,
      status,
      regularizedBy: req.user._id,
      regularizationReason: reason
    });
  }

  const populated = await Attendance.findById(record._id)
    .populate('employee', 'firstName lastName employeeId')
    .populate('regularizedBy', 'firstName lastName employeeId');

  return ApiResponse.success(res, 200, 'Attendance regularized successfully.', {
    attendance: populated
  });
});

module.exports = {
  clockIn,
  clockOut,
  getMyTodayStatus,
  getMyAttendance,
  getAllAttendance,
  regularizeAttendance
};
