const express = require('express');
const router = express.Router();
const {
  getTeamOverview,
  getTeamAttendanceToday,
  getTeamLeaveCalendar
} = require('../controllers/managerController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');

// All manager dashboard endpoints require authentication and Manager or HR Admin privileges
router.use(authenticate);
router.use(authorize('manager', 'hr_admin'));

router.get('/team', getTeamOverview);
router.get('/attendance/today', getTeamAttendanceToday);
router.get('/leaves/upcoming', getTeamLeaveCalendar);

module.exports = router;
