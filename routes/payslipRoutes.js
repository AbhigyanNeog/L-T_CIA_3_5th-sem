const express = require('express');
const router = express.Router();
const {
  getMyPayslips,
  getPayslipById,
  getAllPayslips,
  updatePaymentStatus
} = require('../controllers/payslipController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const { validateObjectId } = require('../middleware/validateMiddleware');

// All payslip routes require authentication
router.use(authenticate);

// Self-service employee payslip queries
router.get('/me', getMyPayslips);
router.get('/:id', validateObjectId(['id']), getPayslipById);

// Company-wide payslip management (HR Admin)
router.get('/', authorize('hr_admin'), getAllPayslips);
router.patch('/:id/status', authorize('hr_admin'), validateObjectId(['id']), updatePaymentStatus);

module.exports = router;
