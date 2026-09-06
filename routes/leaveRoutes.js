const express = require('express');
const router = express.Router();
const {
  applyLeave,
  getMyLeaves,
  cancelLeave,
  getPendingLeaves,
  updateLeaveStatus,
  getAllLeaves
} = require('../controllers/leaveController');
const {
  getMyBalances,
  getEmployeeBalances,
  adjustLeaveBalance,
  getAllLeaveTypes,
  createLeaveType
} = require('../controllers/leaveBalanceController');
const { authenticate } = require('../middleware/authMiddleware');
const {
  authorize,
  checkLeaveApprovalAuthority
} = require('../middleware/rbacMiddleware');
const {
  requireFields,
  validateObjectId,
  validateDates,
  validateDateRange,
  validateEnum
} = require('../middleware/validateMiddleware');

// All leave endpoints require authentication
router.use(authenticate);

// Leave Types
router.get('/types', getAllLeaveTypes);
router.post('/types', authorize('hr_admin'), requireFields(['name', 'code']), createLeaveType);

// Balance Ledgers
router.get('/balances/me', getMyBalances);
router.get('/balances/employee/:id', authorize('hr_admin', 'manager'), validateObjectId(['id']), getEmployeeBalances);
router.patch('/balances/:id', authorize('hr_admin'), validateObjectId(['id']), adjustLeaveBalance);

// Self-Service Application & History
router.post(
  '/apply',
  requireFields(['reason']),
  applyLeave
);
router.get('/me', getMyLeaves);
router.patch('/:id/cancel', validateObjectId(['id']), cancelLeave);

// Approvals & Management (Manager / HR Admin with ownership verification)
router.get('/pending', authorize('hr_admin', 'manager'), getPendingLeaves);
router.patch(
  '/:id/status',
  authorize('hr_admin', 'manager'),
  validateObjectId(['id']),
  checkLeaveApprovalAuthority,
  requireFields(['status']),
  validateEnum('status', ['APPROVED', 'REJECTED']),
  updateLeaveStatus
);

// Company-wide list (HR Admin)
router.get('/', authorize('hr_admin'), getAllLeaves);

module.exports = router;
