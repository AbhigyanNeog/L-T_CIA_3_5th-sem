const User = require('../models/User');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
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
 * @desc    Get manager's direct reports / team overview
 * @route   GET /api/v1/manager/team
 * @access  Private (Manager, HR Admin)
 */
const getTeamOverview = asyncHandler(async (req, res) => {
  const managerId = req.user._id;

  const teamMembers = await User.find({
    reportsTo: managerId,
    status: 'active'
  })
    .populate('department', 'name code')
    .populate('designation', 'title level')
    .sort({ firstName: 1 });

  return ApiResponse.success(res, 200, 'Team overview retrieved.', {
    headcount: teamMembers.length,
    teamMembers
  });
});

/**
 * @desc    Get team attendance status for today
 * @route   GET /api/v1/manager/attendance/today
 * @access  Private (Manager, HR Admin)
 */
const getTeamAttendanceToday = asyncHandler(async (req, res) => {
  const managerId = req.user._id;
  const today = getMidnightUTC();

  // 1. Fetch direct reports
  const teamMembers = await User.find({
    reportsTo: managerId,
    status: 'active'
  })
    .populate('department', 'name code')
    .populate('designation', 'title level');

  const memberIds = teamMembers.map((m) => m._id);

  // 2. Fetch today's attendance records for these team members
  const attendanceRecords = await Attendance.find({
    employee: { $in: memberIds },
    date: today
  });

  const attendanceMap = new Map();
  for (const att of attendanceRecords) {
    attendanceMap.set(att.employee.toString(), att);
  }

  // 3. Compile composite status list
  let presentCount = 0;
  let onLeaveCount = 0;
  let lateCount = 0;
  let notClockedInCount = 0;

  const teamStatusList = teamMembers.map((member) => {
    const record = attendanceMap.get(member._id.toString());
    let currentStatus = 'NOT_CLOCKED_IN';
    let clockInTime = null;
    let clockOutTime = null;
    let totalHours = 0;

    if (record) {
      currentStatus = record.status;
      clockInTime = record.clockIn;
      clockOutTime = record.clockOut;
      totalHours = record.totalHours;

      if (record.status === 'PRESENT') presentCount++;
      else if (record.status === 'LATE') {
        presentCount++;
        lateCount++;
      } else if (record.status === 'ON_LEAVE') onLeaveCount++;
      else if (record.status === 'HALF_DAY') presentCount++;
      else notClockedInCount++;
    } else {
      notClockedInCount++;
    }

    return {
      employee: {
        _id: member._id,
        employeeId: member.employeeId,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        designation: member.designation ? member.designation.title : '',
        department: member.department ? member.department.name : ''
      },
      status: currentStatus,
      clockIn: clockInTime,
      clockOut: clockOutTime,
      totalHours
    };
  });

  return ApiResponse.success(res, 200, "Team today's attendance snapshot retrieved.", {
    date: today.toISOString().split('T')[0],
    totalTeamMembers: teamMembers.length,
    summary: {
      present: presentCount,
      late: lateCount,
      onLeave: onLeaveCount,
      notClockedIn: notClockedInCount
    },
    members: teamStatusList
  });
});

/**
 * @desc    Get upcoming scheduled team leaves for the next 30 days
 * @route   GET /api/v1/manager/leaves/upcoming
 * @access  Private (Manager, HR Admin)
 */
const getTeamLeaveCalendar = asyncHandler(async (req, res) => {
  const managerId = req.user._id;
  const today = getMidnightUTC();
  const nextMonth = new Date(today);
  nextMonth.setUTCDate(today.getUTCDate() + 30);

  const teamMembers = await User.find({ reportsTo: managerId, status: 'active' }).select('_id');
  const memberIds = teamMembers.map((m) => m._id);

  const upcomingLeaves = await LeaveRequest.find({
    employee: { $in: memberIds },
    status: 'APPROVED',
    endDate: { $gte: today },
    startDate: { $lte: nextMonth }
  })
    .populate('employee', 'firstName lastName employeeId department designation')
    .populate('leaveType', 'name code')
    .sort({ startDate: 1 });

  return ApiResponse.success(res, 200, 'Upcoming team leaves retrieved.', {
    count: upcomingLeaves.length,
    leaves: upcomingLeaves
  });
});

module.exports = {
  getTeamOverview,
  getTeamAttendanceToday,
  getTeamLeaveCalendar
};
