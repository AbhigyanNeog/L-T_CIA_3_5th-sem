const express = require('express');
const router = express.Router();
const {
  createDesignation,
  getAllDesignations,
  getDesignationById,
  updateDesignation,
  deleteDesignation
} = require('../controllers/designationController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const { requireFields, validateObjectId } = require('../middleware/validateMiddleware');

// All designation routes require authentication
router.use(authenticate);

// Read endpoints accessible to all authenticated roles
router.get('/', getAllDesignations);
router.get('/:id', validateObjectId(['id']), getDesignationById);

// Write endpoints restricted strictly to HR Admin
router.post('/', authorize('hr_admin'), requireFields(['title', 'department']), createDesignation);
router.put('/:id', authorize('hr_admin'), validateObjectId(['id']), updateDesignation);
router.delete('/:id', authorize('hr_admin'), validateObjectId(['id']), deleteDesignation);

module.exports = router;
