const mongoose = require('mongoose');
const User = require('../models/User');
const Department = require('../models/Department');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const Payslip = require('../models/Payslip');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Normalizes date to midnight UTC
 */
const getMidnightUTC = (d = new Date()) => {
  const date = new Date(d);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

/**
 * @desc    Get top-level KPI metrics for HR Admin Executive Dashboard
 * @route   GET /api/v1/analytics/executive
 * @access  Private (HR Admin)
 */
const getExecutiveDashboardStats = asyncHandler(async (req, res) => {
  const today = getMidnightUTC();

  // Parallel aggregate queries for ultra-fast response
  const [
    totalEmployees,
    totalDepartments,
    attendanceTodayRecords,
    pendingLeavesCount,
    latestPayslips,
    recentLeaves
  ] = await Promise.all([
    User.countDocuments({ status: 'active' }),
    Department.countDocuments({ isActive: true }),
    Attendance.find({ date: today }),
    LeaveRequest.countDocuments({ status: 'PENDING' }),
    Payslip.find().sort({ payPeriodYear: -1, payPeriodMonth: -1 }).limit(100),
    LeaveRequest.find()
      .populate('employee', 'firstName lastName employeeId department')
      .populate('leaveType', 'name code')
      .sort({ createdAt: -1 })
      .limit(5)
  ]);

  let presentToday = 0;
  let lateToday = 0;
  let onLeaveToday = 0;

  for (const att of attendanceTodayRecords) {
    if (att.status === 'PRESENT') presentToday++;
    else if (att.status === 'LATE') {
      presentToday++;
      lateToday++;
    } else if (att.status === 'HALF_DAY') presentToday += 0.5;
    else if (att.status === 'ON_LEAVE') onLeaveToday++;
  }

  const attendanceRate =
    totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 1000) / 10 : 0;

  // Compute latest month payroll disbursed total
  let latestMonthlyPayroll = 0;
  if (latestPayslips.length > 0) {
    const latestYear = latestPayslips[0].payPeriodYear;
    const latestMonth = latestPayslips[0].payPeriodMonth;
    const currentMonthPayslips = latestPayslips.filter(
      (p) => p.payPeriodYear === latestYear && p.payPeriodMonth === latestMonth
    );
    latestMonthlyPayroll = currentMonthPayslips.reduce((acc, curr) => acc + curr.netSalary, 0);
  }

  return ApiResponse.success(res, 200, 'Executive dashboard metrics retrieved.', {
    kpis: {
      totalEmployees,
      totalDepartments,
      presentToday: Math.round(presentToday),
      attendanceRate: `${attendanceRate}%`,
      pendingLeavesCount,
      monthlyPayrollDisbursed: Math.round(latestMonthlyPayroll * 100) / 100
    },
    todayBreakdown: {
      present: Math.round(presentToday),
      late: lateToday,
      onLeave: onLeaveToday,
      notClockedIn: Math.max(0, totalEmployees - Math.round(presentToday) - onLeaveToday)
    },
    recentLeaves
  });
});

/**
 * @desc    Get departmental headcount and demographic analytics via MongoDB Aggregation
 * @route   GET /api/v1/analytics/headcount
 * @access  Private (HR Admin)
 */
const getHeadcountAnalytics = asyncHandler(async (req, res) => {
  const departmentBreakdown = await User.aggregate([
    { $match: { status: 'active' } },
    {
      $group: {
        _id: '$department',
        count: { $sum: 1 },
        averageSalary: { $avg: '$baseSalary' },
        minSalary: { $min: '$baseSalary' },
        maxSalary: { $max: '$baseSalary' }
      }
    },
    {
      $lookup: {
        from: 'departments',
        localField: '_id',
        foreignField: '_id',
        as: 'deptInfo'
      }
    },
    {
      $unwind: {
        path: '$deptInfo',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $project: {
        _id: 1,
        departmentName: { $ifNull: ['$deptInfo.name', 'Unassigned'] },
        departmentCode: { $ifNull: ['$deptInfo.code', 'N/A'] },
        count: 1,
        averageSalary: { $round: ['$averageSalary', 2] },
        minSalary: 1,
        maxSalary: 1
      }
    },
    { $sort: { count: -1 } }
  ]);

  const roleDistribution = await User.aggregate([
    { $match: { status: 'active' } },
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 }
      }
    }
  ]);

  return ApiResponse.success(res, 200, 'Headcount analytics retrieved.', {
    departments: departmentBreakdown,
    roles: roleDistribution
  });
});

/**
 * @desc    Get monthly payroll expenditure analytics via MongoDB Aggregation
 * @route   GET /api/v1/analytics/payroll
 * @access  Private (HR Admin)
 */
const getPayrollAnalytics = asyncHandler(async (req, res) => {
  const monthlyTrends = await Payslip.aggregate([
    {
      $group: {
        _id: { year: '$payPeriodYear', month: '$payPeriodMonth' },
        totalGross: { $sum: '$grossEarnings' },
        totalDeductions: { $sum: '$totalDeductions' },
        totalNetSalary: { $sum: '$netSalary' },
        totalLOP: { $sum: '$deductions.lopDeduction' },
        employeeCount: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 0,
        year: '$_id.year',
        month: '$_id.month',
        totalGross: { $round: ['$totalGross', 2] },
        totalDeductions: { $round: ['$totalDeductions', 2] },
        totalNetSalary: { $round: ['$totalNetSalary', 2] },
        totalLOP: { $round: ['$totalLOP', 2] },
        employeeCount: 1
      }
    },
    { $sort: { year: -1, month: -1 } },
    { $limit: 12 }
  ]);

  return ApiResponse.success(res, 200, 'Payroll analytics retrieved.', {
    monthlyTrends: monthlyTrends.reverse()
  });
});

/**
 * @desc    Get leave utilization analytics via MongoDB Aggregation
 * @route   GET /api/v1/analytics/leaves
 * @access  Private (HR Admin)
 */
const getLeaveUtilizationAnalytics = asyncHandler(async (req, res) => {
  const byLeaveType = await LeaveRequest.aggregate([
    {
      $group: {
        _id: '$leaveType',
        totalApplications: { $sum: 1 },
        totalDaysRequested: { $sum: '$totalDays' },
        approvedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'APPROVED'] }, 1, 0] }
        },
        rejectedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'REJECTED'] }, 1, 0] }
        }
      }
    },
    {
      $lookup: {
        from: 'leavetypes',
        localField: '_id',
        foreignField: '_id',
        as: 'typeInfo'
      }
    },
    { $unwind: '$typeInfo' },
    {
      $project: {
        _id: 1,
        leaveTypeName: '$typeInfo.name',
        leaveTypeCode: '$typeInfo.code',
        totalApplications: 1,
        totalDaysRequested: 1,
        approvedCount: 1,
        rejectedCount: 1
      }
    }
  ]);

  const byStatus = await LeaveRequest.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  return ApiResponse.success(res, 200, 'Leave utilization analytics retrieved.', {
    byLeaveType,
    byStatus
  });
});

/**
 * @desc    Get attendance trends and department-wise attendance breakdown via MongoDB Aggregation
 * @route   GET /api/v1/analytics/attendance
 * @access  Private (HR Admin)
 */
const getAttendanceTrendsAnalytics = asyncHandler(async (req, res) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);
  thirtyDaysAgo.setUTCHours(0, 0, 0, 0);

  // 1. Daily trends over the last 30 days
  const dailyTrends = await Attendance.aggregate([
    { $match: { date: { $gte: thirtyDaysAgo } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        presentCount: {
          $sum: { $cond: [{ $in: ['$status', ['PRESENT', 'LATE']] }, 1, 0] }
        },
        lateCount: {
          $sum: { $cond: [{ $eq: ['$status', 'LATE'] }, 1, 0] }
        },
        halfDayCount: {
          $sum: { $cond: [{ $eq: ['$status', 'HALF_DAY'] }, 1, 0] }
        },
        onLeaveCount: {
          $sum: { $cond: [{ $eq: ['$status', 'ON_LEAVE'] }, 1, 0] }
        },
        totalLogged: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        date: '$_id',
        presentCount: 1,
        lateCount: 1,
        halfDayCount: 1,
        onLeaveCount: 1,
        totalLogged: 1
      }
    }
  ]);

  // 2. Department-wise attendance breakdown
  const departmentAttendance = await Attendance.aggregate([
    { $match: { date: { $gte: thirtyDaysAgo } } },
    {
      $lookup: {
        from: 'users',
        localField: 'employee',
        foreignField: '_id',
        as: 'userInfo'
      }
    },
    { $unwind: '$userInfo' },
    {
      $group: {
        _id: '$userInfo.departmentId',
        totalLogs: { $sum: 1 },
        presentLogs: {
          $sum: { $cond: [{ $in: ['$status', ['PRESENT', 'LATE']] }, 1, 0] }
        }
      }
    },
    {
      $lookup: {
        from: 'departments',
        localField: '_id',
        foreignField: '_id',
        as: 'dept'
      }
    },
    {
      $unwind: {
        path: '$dept',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $project: {
        _id: 1,
        departmentName: { $ifNull: ['$dept.name', 'General'] },
        totalLogs: 1,
        presentLogs: 1,
        attendanceRate: {
          $concat: [
            {
              $toString: {
                $round: [
                  {
                    $multiply: [{ $divide: ['$presentLogs', { $max: [1, '$totalLogs'] }] }, 100]
                  },
                  1
                ]
              }
            },
            '%'
          ]
        }
      }
    }
  ]);

  return ApiResponse.success(res, 200, 'Attendance trends and departmental analytics retrieved.', {
    period: 'Last 30 Days',
    dailyTrends,
    departmentAttendance
  });
});

module.exports = {
  getExecutiveDashboardStats,
  getHeadcountAnalytics,
  getPayrollAnalytics,
  getLeaveUtilizationAnalytics,
  getAttendanceTrendsAnalytics
};
