const Payslip = require('../models/Payslip');
const User = require('../models/User');
const AppError = require('../utils/appError');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get authenticated employee's payslips
 * @route   GET /api/v1/payslips/me
 * @access  Private (Authenticated Employee)
 */
const getMyPayslips = asyncHandler(async (req, res) => {
  const { year, page = 1, limit = 12 } = req.query;
  const filter = { employee: req.user._id };

  if (year) filter.payPeriodYear = Number(year);

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, parseInt(limit, 10));
  const skip = (pageNum - 1) * limitNum;

  const [payslips, total] = await Promise.all([
    Payslip.find(filter)
      .sort({ payPeriodYear: -1, payPeriodMonth: -1 })
      .skip(skip)
      .limit(limitNum),
    Payslip.countDocuments(filter)
  ]);

  return ApiResponse.success(res, 200, 'Payslips retrieved successfully.', {
    payslips,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum)
    }
  });
});

/**
 * @desc    Get single payslip details by ID (Employee self, or HR Admin)
 * @route   GET /api/v1/payslips/:id
 * @access  Private (Self, HR Admin)
 */
const getPayslipById = asyncHandler(async (req, res, next) => {
  const payslip = await Payslip.findById(req.params.id).populate(
    'employee',
    'firstName lastName employeeId email department designation joiningDate'
  );

  if (!payslip) {
    return next(new AppError('Payslip not found.', 404));
  }

  const isSelf = req.user._id.toString() === payslip.employee._id.toString();
  const isAdmin = req.user.role === 'hr_admin';

  if (!isSelf && !isAdmin) {
    return next(new AppError('Forbidden: You can only view your own payslips.', 403));
  }

  return ApiResponse.success(res, 200, 'Payslip details retrieved successfully.', {
    payslip
  });
});

/**
 * @desc    Get all company payslips with filters (HR Admin)
 * @route   GET /api/v1/payslips
 * @access  Private (HR Admin)
 */
const getAllPayslips = asyncHandler(async (req, res) => {
  const { month, year, department, paymentStatus, employeeId, page = 1, limit = 50 } = req.query;
  const filter = {};

  if (month) filter.payPeriodMonth = Number(month);
  if (year) filter.payPeriodYear = Number(year);
  if (paymentStatus) filter.paymentStatus = paymentStatus.toUpperCase();
  if (employeeId) filter.employee = employeeId;

  if (department) {
    const deptEmployees = await User.find({ department }).select('_id');
    const empIds = deptEmployees.map((e) => e._id);
    filter.employee = { $in: empIds };
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, parseInt(limit, 10));
  const skip = (pageNum - 1) * limitNum;

  const [payslips, total] = await Promise.all([
    Payslip.find(filter)
      .populate('employee', 'firstName lastName employeeId department designation')
      .populate({
        path: 'employee',
        populate: [
          { path: 'department', select: 'name code' },
          { path: 'designation', select: 'title level' }
        ]
      })
      .sort({ payPeriodYear: -1, payPeriodMonth: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Payslip.countDocuments(filter)
  ]);

  return ApiResponse.success(res, 200, 'Company payslips retrieved.', {
    payslips,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum)
    }
  });
});

/**
 * @desc    Update payslip disbursement / payment status (HR Admin)
 * @route   PATCH /api/v1/payslips/:id/status
 * @access  Private (HR Admin)
 */
const updatePaymentStatus = asyncHandler(async (req, res, next) => {
  const { paymentStatus, transactionReference, paymentDate, remarks } = req.body;

  const payslip = await Payslip.findById(req.params.id);
  if (!payslip) {
    return next(new AppError('Payslip not found.', 404));
  }

  if (paymentStatus) {
    if (!['DRAFT', 'PROCESSED', 'PAID'].includes(paymentStatus.toUpperCase())) {
      return next(new AppError('Invalid payment status.', 400));
    }
    payslip.paymentStatus = paymentStatus.toUpperCase();
  }

  if (transactionReference !== undefined) payslip.transactionReference = transactionReference;
  if (paymentDate !== undefined) payslip.paymentDate = new Date(paymentDate);
  if (remarks !== undefined) payslip.remarks = remarks;

  if (payslip.paymentStatus === 'PAID' && !payslip.paymentDate) {
    payslip.paymentDate = new Date();
  }

  await payslip.save();

  const populated = await Payslip.findById(payslip._id).populate(
    'employee',
    'firstName lastName employeeId'
  );

  return ApiResponse.success(res, 200, 'Payslip payment status updated successfully.', {
    payslip: populated
  });
});

module.exports = {
  getMyPayslips,
  getPayslipById,
  getAllPayslips,
  updatePaymentStatus
};
