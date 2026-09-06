const express = require('express');
const router = express.Router();
const {
  createHoliday,
  getAllHolidays,
  getHolidayById,
  updateHoliday,
  deleteHoliday
} = require('../controllers/holidayController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const { requireFields, validateObjectId, validateDates } = require('../middleware/validateMiddleware');

// All holiday routes require authentication
router.use(authenticate);

// View calendar holidays (all employees, managers, HR)
router.get('/', getAllHolidays);
router.get('/:id', validateObjectId(['id']), getHolidayById);

// Admin controls
router.post('/', authorize('hr_admin'), requireFields(['name', 'date']), validateDates(['date']), createHoliday);
router.put('/:id', authorize('hr_admin'), validateObjectId(['id']), updateHoliday);
router.delete('/:id', authorize('hr_admin'), validateObjectId(['id']), deleteHoliday);

module.exports = router;
