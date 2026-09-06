const express = require('express');
const router = express.Router();
const { runPayroll, getPayrollSummary } = require('../controllers/payrollController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const { requireFields } = require('../middleware/validateMiddleware');

// All payroll routes require authentication and HR Admin privileges
router.use(authenticate);
router.use(authorize('hr_admin'));

// Execute payroll calculation
router.post('/run', requireFields(['month', 'year']), runPayroll);

// Get summary metrics for a pay period
router.get('/summary', getPayrollSummary);

module.exports = router;
