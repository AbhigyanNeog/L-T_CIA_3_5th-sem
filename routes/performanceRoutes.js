const express = require('express');
const router = express.Router();
const {
  createPerformanceNote,
  getEmployeePerformanceNotes,
  getMyPerformanceNotes,
  updatePerformanceNote,
  deletePerformanceNote
} = require('../controllers/performanceNoteController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const { requireFields, validateObjectId } = require('../middleware/validateMiddleware');

// All performance note routes require authentication
router.use(authenticate);

// Employee self-service: View notes shared with me
router.get('/me', getMyPerformanceNotes);

// Create performance review (Manager, HR Admin)
router.post(
  '/',
  authorize('manager', 'hr_admin'),
  requireFields(['employeeId', 'rating', 'title', 'comments']),
  validateObjectId(['employeeId'], 'body'),
  createPerformanceNote
);

// View notes for a specific employee (Self, Manager of direct report, HR Admin)
router.get('/employee/:id', validateObjectId(['id']), getEmployeePerformanceNotes);

// Edit or delete note
router.put('/:id', authorize('manager', 'hr_admin'), validateObjectId(['id']), updatePerformanceNote);
router.delete('/:id', authorize('manager', 'hr_admin'), validateObjectId(['id']), deletePerformanceNote);

module.exports = router;
