const express = require('express');
const router = express.Router();
const {
  onboardEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  updateMyProfile
} = require('../controllers/employeeController');
const { authenticate } = require('../middleware/authMiddleware');
const {
  authorize,
  requireAdmin,
  checkProfileOwnership
} = require('../middleware/rbacMiddleware');
const { requireFields, validateObjectId, validateEnum } = require('../middleware/validateMiddleware');

// All employee routes require authentication
router.use(authenticate);

// Self-service profile update for currently logged-in employee
router.patch('/me', updateMyProfile);

// Listing accessible to HR Admin and Manager
router.get('/', authorize('hr_admin', 'manager'), getAllEmployees);

// Individual profile query guarded by ownership (self, direct manager, or HR Admin)
router.get('/:id', validateObjectId(['id']), checkProfileOwnership, getEmployeeById);

// Administrative employee registration & onboarding (HR Admin only)
router.post(
  '/onboard',
  requireAdmin,
  requireFields(['email']),
  validateEnum('role', ['EMPLOYEE', 'MANAGER', 'HR_ADMIN']),
  onboardEmployee
);

router.post(
  '/register',
  requireAdmin,
  requireFields(['email']),
  validateEnum('role', ['EMPLOYEE', 'MANAGER', 'HR_ADMIN']),
  onboardEmployee
);

router.put('/:id', requireAdmin, validateObjectId(['id']), updateEmployee);

module.exports = router;
