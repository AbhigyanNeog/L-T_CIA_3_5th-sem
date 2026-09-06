const express = require('express');
const router = express.Router();
const {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment
} = require('../controllers/departmentController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const { requireFields, validateObjectId } = require('../middleware/validateMiddleware');

// All department routes require authentication
router.use(authenticate);

// Read endpoints accessible to all authenticated roles
router.get('/', getAllDepartments);
router.get('/:id', validateObjectId(['id']), getDepartmentById);

// Write endpoints restricted strictly to HR Admin
router.post('/', authorize('hr_admin'), requireFields(['name', 'code']), createDepartment);
router.put('/:id', authorize('hr_admin'), validateObjectId(['id']), updateDepartment);
router.delete('/:id', authorize('hr_admin'), validateObjectId(['id']), deleteDepartment);

module.exports = router;
