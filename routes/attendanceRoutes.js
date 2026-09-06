const express = require('express');
const router = express.Router();
const {
  clockIn,
  clockOut,
  getMyTodayStatus,
  getMyAttendance,
  getAllAttendance,
  regularizeAttendance
} = require('../controllers/attendanceController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const {
  requireFields,
  validateObjectId,
  validateDates,
  validateEnum
} = require('../middleware/validateMiddleware');

// All attendance routes require authentication
router.use(authenticate);

// Self-service clock actions and personal attendance history
router.post('/clock-in', clockIn);
router.post('/clock-out', clockOut);
router.get('/today', getMyTodayStatus);
router.get('/me', getMyAttendance);

// Manager & HR Admin company-wide attendance monitoring
router.get('/', authorize('hr_admin', 'manager'), getAllAttendance);

// HR Admin manual attendance adjustment
router.post(
  '/regularize',
  authorize('hr_admin'),
  requireFields(['employeeId', 'date', 'status', 'reason']),
  validateObjectId(['employeeId'], 'body'),
  validateDates(['date']),
  validateEnum('status', ['PRESENT', 'ABSENT', 'HALF_DAY', 'ON_LEAVE', 'LATE']),
  regularizeAttendance
);

module.exports = router;
