const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const Holiday = require('../models/Holiday');

/**
 * Returns all calendar dates in a month as Date objects normalized to UTC midnight
 */
const getDatesInMonth = (year, month) => {
  const dates = [];
  const totalDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
  for (let d = 1; d <= totalDays; d++) {
    dates.push(new Date(Date.UTC(year, month - 1, d)));
  }
  return dates;
};

/**
 * Computes working days in a given month excluding weekends and official company holidays
 */
const getMonthlyWorkingDays = async (year, month) => {
  const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const holidays = await Holiday.find({
    date: { $gte: startOfMonth, $lte: endOfMonth }
  });

  const holidayTimestamps = new Set(
    holidays.map((h) => new Date(h.date).setUTCHours(0, 0, 0, 0))
  );

  const allDates = getDatesInMonth(year, month);
  let workingDaysCount = 0;

  for (const date of allDates) {
    const dayOfWeek = date.getUTCDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = holidayTimestamps.has(date.getTime());

    if (!isWeekend && !isHoliday) {
      workingDaysCount++;
    }
  }

  // Ensure minimum baseline of 20 working days to prevent division by zero edge cases
  return Math.max(1, workingDaysCount);
};

/**
 * Executes payroll calculation for a single employee for a target month/year
 * @param {Object} employee - Employee Mongoose document
 * @param {number} month - 1 to 12
 * @param {number} year - YYYY
 */
const computeEmployeePayroll = async (employee, month, year) => {
  const baseSalary = Number(employee.baseSalary) || 0;
  const totalWorkingDays = await getMonthlyWorkingDays(year, month);

  const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  // 1. Query Attendance records for this month
  const attendanceRecords = await Attendance.find({
    employee: employee._id,
    date: { $gte: startOfMonth, $lte: endOfMonth }
  });

  let fullDays = 0;
  let halfDays = 0;

  for (const att of attendanceRecords) {
    if (att.status === 'PRESENT' || att.status === 'LATE') {
      fullDays++;
    } else if (att.status === 'HALF_DAY') {
      halfDays++;
    }
  }

  const daysPresent = fullDays + halfDays * 0.5;

  // 2. Query Approved Paid Leaves in this month
  const approvedLeaves = await LeaveRequest.find({
    employee: employee._id,
    status: 'APPROVED',
    startDate: { $lte: endOfMonth },
    endDate: { $gte: startOfMonth }
  }).populate('leaveType');

  let approvedPaidLeaves = 0;
  for (const leave of approvedLeaves) {
    if (leave.leaveType && leave.leaveType.isPaid) {
      approvedPaidLeaves += leave.totalDays;
    }
  }

  // 3. Compute Loss of Pay (LOP) Days
  // Total work credit = daysPresent + approvedPaidLeaves
  const totalCreditedDays = daysPresent + approvedPaidLeaves;
  const lopDays = Math.max(0, Math.round((totalWorkingDays - totalCreditedDays) * 10) / 10);

  // 4. Compute Deductions & Allowances
  const perDayPay = totalWorkingDays > 0 ? baseSalary / totalWorkingDays : 0;
  const lopDeduction = Math.round(perDayPay * lopDays * 100) / 100;

  // Standard corporate allowances: HRA 40%, DA 10%, Special 10%, Medical $1,250
  const hra = Math.round(baseSalary * 0.4);
  const da = Math.round(baseSalary * 0.1);
  const special = Math.round(baseSalary * 0.1);
  const medical = baseSalary > 0 ? 1250 : 0;

  const grossEarnings = baseSalary + hra + da + special + medical;

  // Statutory Deductions: PF 12% of basic, PT standard $200, TDS estimated 5% of gross
  const pf = Math.round(baseSalary * 0.12);
  const professionalTax = baseSalary > 0 ? 200 : 0;
  const tds = Math.round(grossEarnings * 0.05);

  const totalDeductions = pf + professionalTax + tds + lopDeduction;
  const netSalary = Math.max(0, Math.round((grossEarnings - totalDeductions) * 100) / 100);

  return {
    employeeId: employee._id,
    payPeriodMonth: Number(month),
    payPeriodYear: Number(year),
    baseSalarySnapshot: baseSalary,
    allowances: {
      hra,
      da,
      special,
      medical
    },
    grossEarnings,
    deductions: {
      pf,
      professionalTax,
      tds,
      lopDeduction
    },
    totalDeductions,
    netSalary,
    totalWorkingDays,
    daysPresent,
    approvedPaidLeaves,
    lopDays
  };
};

module.exports = {
  getMonthlyWorkingDays,
  computeEmployeePayroll
};
