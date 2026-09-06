const LeaveType = require('../models/LeaveType');
const LeaveBalance = require('../models/LeaveBalance');
const User = require('../models/User');
const AppError = require('../utils/appError');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Helper function to provision leave balances for an employee for a given calendar year
 */
const provisionEmployeeBalances = async (employeeId, year = new Date().getUTCFullYear()) => {
  const activeLeaveTypes = await LeaveType.find({ isActive: true });
  const createdBalances = [];

  for (const lt of activeLeaveTypes) {
    let balance = await LeaveBalance.findOne({
      employee: employeeId,
      leaveType: lt._id,
      year
    });

    if (!balance) {
      balance = await LeaveBalance.create({
        employee: employeeId,
        leaveType: lt._id,
        year,
        allocatedDays: lt.annualQuota,
        usedDays: 0,
        pendingDays: 0,
        remainingDays: lt.annualQuota
      });
    }
    createdBalances.push(balance);
  }

  return createdBalances;
};

/**
 * @desc    Get authenticated employee's leave balances
 * @route   GET /api/v1/leaves/balances/me
 * @access  Private
 */
const getMyBalances = asyncHandler(async (req, res) => {
  const year = req.query.year ? Number(req.query.year) : new Date().getUTCFullYear();

  let [balances, embeddedDoc] = await Promise.all([
    LeaveBalance.find({
      employeeId: req.user._id,
      year
    }).populate('leaveType', 'name code annualQuota isPaid isCarryForward'),
    LeaveBalance.findOne({
      employeeId: req.user._id,
      year
    })
  ]);

  // Auto-provision if no balance ledger exists for this year
  if (!embeddedDoc) {
    embeddedDoc = await LeaveBalance.create({
      employeeId: req.user._id,
      year,
      casual: { allocated: 12, used: 0, remaining: 12 },
      sick: { allocated: 10, used: 0, remaining: 10 },
      earned: { allocated: 15, used: 0, remaining: 15 }
    });
  }

  return ApiResponse.success(res, 200, 'Leave balances retrieved successfully.', {
    year,
    quotas: {
      casual: embeddedDoc.casual,
      sick: embeddedDoc.sick,
      earned: embeddedDoc.earned
    },
    balances
  });
});

/**
 * @desc    Get leave balances for a specific employee (Manager / HR Admin)
 * @route   GET /api/v1/leaves/balances/employee/:id
 * @access  Private (Manager of report, HR Admin)
 */
const getEmployeeBalances = asyncHandler(async (req, res, next) => {
  const targetEmployeeId = req.params.id;
  const year = req.query.year ? Number(req.query.year) : new Date().getUTCFullYear();

  const employee = await User.findById(targetEmployeeId);
  if (!employee) {
    return next(new AppError('Employee not found.', 404));
  }

  // Authorization: Self, Manager of this report, or HR Admin
  const isSelf = req.user._id.toString() === employee._id.toString();
  const isManager =
    req.user.role === 'manager' &&
    employee.reportsTo &&
    employee.reportsTo.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'hr_admin';

  if (!isSelf && !isManager && !isAdmin) {
    return next(new AppError('Forbidden: You cannot view leave balances for this employee.', 403));
  }

  let [balances, embeddedDoc] = await Promise.all([
    LeaveBalance.find({
      employeeId: targetEmployeeId,
      year
    }).populate('leaveType', 'name code annualQuota isPaid'),
    LeaveBalance.findOne({
      employeeId: targetEmployeeId,
      year
    })
  ]);

  if (!embeddedDoc) {
    embeddedDoc = await LeaveBalance.create({
      employeeId: targetEmployeeId,
      year,
      casual: { allocated: 12, used: 0, remaining: 12 },
      sick: { allocated: 10, used: 0, remaining: 10 },
      earned: { allocated: 15, used: 0, remaining: 15 }
    });
  }

  return ApiResponse.success(res, 200, 'Employee leave balances retrieved.', {
    employee: {
      _id: employee._id,
      employeeId: employee.employeeId,
      name: employee.name || `${employee.firstName || ''} ${employee.lastName || ''}`.trim()
    },
    year,
    quotas: {
      casual: embeddedDoc.casual,
      sick: embeddedDoc.sick,
      earned: embeddedDoc.earned
    },
    balances
  });
});

/**
 * @desc    Adjust employee leave balance (HR Admin)
 * @route   PATCH /api/v1/leaves/balances/:id
 * @access  Private (HR Admin)
 */
const adjustLeaveBalance = asyncHandler(async (req, res, next) => {
  const { allocatedDays, usedDays } = req.body;

  const balance = await LeaveBalance.findById(req.params.id).populate('leaveType', 'name code');
  if (!balance) {
    return next(new AppError('Leave balance record not found.', 404));
  }

  if (allocatedDays !== undefined) balance.allocatedDays = Number(allocatedDays);
  if (usedDays !== undefined) balance.usedDays = Number(usedDays);

  await balance.save();

  return ApiResponse.success(res, 200, 'Leave balance adjusted successfully.', {
    balance
  });
});

/**
 * @desc    Leave Type CRUD: Get all leave types
 * @route   GET /api/v1/leaves/types
 * @access  Private (All authenticated)
 */
const getAllLeaveTypes = asyncHandler(async (req, res) => {
  const leaveTypes = await LeaveType.find().sort({ name: 1 });
  return ApiResponse.success(res, 200, 'Leave types retrieved successfully.', {
    leaveTypes
  });
});

/**
 * @desc    Create new leave type (HR Admin)
 * @route   POST /api/v1/leaves/types
 * @access  Private (HR Admin)
 */
const createLeaveType = asyncHandler(async (req, res, next) => {
  const { name, code, description, annualQuota, isPaid, isCarryForward } = req.body;

  const existing = await LeaveType.findOne({
    $or: [{ name: new RegExp(`^${name}$`, 'i') }, { code: code.toUpperCase() }]
  });

  if (existing) {
    return next(new AppError('Leave type with this name or code already exists.', 409));
  }

  const leaveType = await LeaveType.create({
    name,
    code: code.toUpperCase(),
    description,
    annualQuota: annualQuota !== undefined ? Number(annualQuota) : 12,
    isPaid: isPaid !== undefined ? isPaid : true,
    isCarryForward: isCarryForward || false
  });

  return ApiResponse.success(res, 201, 'Leave type created successfully.', {
    leaveType
  });
});

module.exports = {
  provisionEmployeeBalances,
  getMyBalances,
  getEmployeeBalances,
  adjustLeaveBalance,
  getAllLeaveTypes,
  createLeaveType
};
