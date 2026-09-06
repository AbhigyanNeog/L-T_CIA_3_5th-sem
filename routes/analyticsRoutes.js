const express = require('express');
const router = express.Router();
const {
  getExecutiveDashboardStats,
  getHeadcountAnalytics,
  getPayrollAnalytics,
  getLeaveUtilizationAnalytics,
  getAttendanceTrendsAnalytics
} = require('../controllers/analyticsController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');

// All analytics endpoints require authentication and HR Admin access
router.use(authenticate);
router.use(authorize('hr_admin'));

router.get('/executive', getExecutiveDashboardStats);
router.get('/headcount', getHeadcountAnalytics);
router.get('/payroll', getPayrollAnalytics);
router.get('/leaves', getLeaveUtilizationAnalytics);
router.get('/attendance', getAttendanceTrendsAnalytics);

module.exports = router;
