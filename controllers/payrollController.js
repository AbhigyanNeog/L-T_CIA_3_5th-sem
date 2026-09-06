const User = require('../models/User');
const Payslip = require('../models/Payslip');
const AppError = require('../utils/appError');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { computeEmployeePayroll } = require('../utils/payrollEngine');

/**
 * @desc    Execute monthly payroll computation and generate payslips
 * @route   POST /api/v1/payroll/run
 * @access  Private (HR Admin)
 */
const runPayroll = asyncHandler(async (req, res, next) => {
  const { month, year, department, rerun } = req.body;

  if (!month || !year) {
    return next(new AppError('Month and Year are required to execute a payroll run.', 400));
  }

  const monthNum = Number(month);
  const yearNum = Number(year);

  if (monthNum < 1 || monthNum > 12) {
    return next(new AppError('Month must be between 1 and 12.', 400));
  }

  // Duplicate Payroll Prevention: Prevent accidental duplicate runs unless rerun: true is supplied
  const existingCount = await Payslip.countDocuments({
    payPeriodMonth: monthNum,
    payPeriodYear: yearNum
  });

  if (existingCount > 0 && !rerun) {
    return next(
      new AppError(
        `Duplicate Payroll Prevention: Payroll for ${monthNum}/${yearNum} has already been generated (${existingCount} records found). Provide 'rerun: true' in the request body to perform an explicit recalculation.`,
        409
      )
    );
  }

  const employeeFilter = { status: 'active' };
  if (department) {
    employeeFilter.department = department;
  }

  const employees = await User.find(employeeFilter)
    .populate('departmentId', 'name code')
    .populate('designationId', 'title level');

  if (employees.length === 0) {
    return next(new AppError('No active employees found matching the criteria for payroll execution.', 404));
  }

  const generatedPayslips = [];
  let totalGross = 0;
  let totalDeductions = 0;
  let totalNet = 0;
  let totalLOP = 0;

  for (const emp of employees) {
    const calc = await computeEmployeePayroll(emp, monthNum, yearNum);

    // Upsert payslip document so multiple runs update draft/processed calculations cleanly
    const payslip = await Payslip.findOneAndUpdate(
      {
        employee: emp._id,
        payPeriodMonth: monthNum,
        payPeriodYear: yearNum
      },
      {
        employee: emp._id,
        payPeriodMonth: monthNum,
        payPeriodYear: yearNum,
        baseSalarySnapshot: calc.baseSalarySnapshot,
        allowances: calc.allowances,
        grossEarnings: calc.grossEarnings,
        deductions: calc.deductions,
        totalDeductions: calc.totalDeductions,
        netSalary: calc.netSalary,
        totalWorkingDays: calc.totalWorkingDays,
        daysPresent: calc.daysPresent,
        approvedPaidLeaves: calc.approvedPaidLeaves,
        lopDays: calc.lopDays,
        paymentStatus: 'PROCESSED',
        remarks: `Automated payroll execution for ${monthNum}/${yearNum}`
      },
      { upsert: true, new: true }
    ).populate('employee', 'firstName lastName employeeId email department designation');

    generatedPayslips.push(payslip);
    totalGross += calc.grossEarnings;
    totalDeductions += calc.totalDeductions;
    totalNet += calc.netSalary;
    totalLOP += calc.deductions.lopDeduction;
  }

  return ApiResponse.success(res, 200, `Payroll run completed for ${monthNum}/${yearNum}.`, {
    payPeriod: `${monthNum}/${yearNum}`,
    employeesProcessed: generatedPayslips.length,
    summary: {
      totalGrossDisbursed: Math.round(totalGross * 100) / 100,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      totalNetPaid: Math.round(totalNet * 100) / 100,
      totalLossOfPayDeductions: Math.round(totalLOP * 100) / 100
    },
    payslips: generatedPayslips
  });
});

/**
 * @desc    Get aggregate payroll metrics for a given pay period
 * @route   GET /api/v1/payroll/summary
 * @access  Private (HR Admin)
 */
const getPayrollSummary = asyncHandler(async (req, res, next) => {
  const { month, year } = req.query;

  if (!month || !year) {
    return next(new AppError('Month and Year parameters are required.', 400));
  }

  const monthNum = Number(month);
  const yearNum = Number(year);

  const payslips = await Payslip.find({
    payPeriodMonth: monthNum,
    payPeriodYear: yearNum
  }).populate('employee', 'firstName lastName employeeId department designation');

  let totalGross = 0;
  let totalDeductions = 0;
  let totalNet = 0;
  let totalLOP = 0;
  let paidCount = 0;
  let processedCount = 0;

  for (const p of payslips) {
    totalGross += p.grossEarnings;
    totalDeductions += p.totalDeductions;
    totalNet += p.netSalary;
    totalLOP += p.deductions.lopDeduction;
    if (p.paymentStatus === 'PAID') paidCount++;
    if (p.paymentStatus === 'PROCESSED') processedCount++;
  }

  return ApiResponse.success(res, 200, 'Payroll summary retrieved.', {
    payPeriod: `${monthNum}/${yearNum}`,
    totalPayslips: payslips.length,
    statusBreakdown: {
      processed: processedCount,
      paid: paidCount
    },
    totals: {
      totalGross: Math.round(totalGross * 100) / 100,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      totalNetSalary: Math.round(totalNet * 100) / 100,
      totalLOPDeductions: Math.round(totalLOP * 100) / 100
    },
    payslips
  });
});

module.exports = {
  runPayroll,
  getPayrollSummary
};
