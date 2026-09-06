const PerformanceNote = require('../models/PerformanceNote');
const User = require('../models/User');
const AppError = require('../utils/appError');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Create a performance review / note for an employee
 * @route   POST /api/v1/performance
 * @access  Private (Manager for direct report, HR Admin)
 */
const createPerformanceNote = asyncHandler(async (req, res, next) => {
  const { employeeId, category, rating, title, comments, isSharedWithEmployee } = req.body;

  const targetEmployee = await User.findById(employeeId);
  if (!targetEmployee) {
    return next(new AppError('Target employee not found.', 404));
  }

  // Authorization: Manager must manage this employee, or user is HR Admin
  const managerRef = targetEmployee.managerId || targetEmployee.reportsTo;
  const isDirectManager =
    req.user.role === 'manager' &&
    managerRef &&
    managerRef.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'hr_admin';

  if (!isDirectManager && !isAdmin) {
    return next(
      new AppError('Forbidden: You can only log performance notes for your direct reports.', 403)
    );
  }

  const note = await PerformanceNote.create({
    employee: employeeId,
    author: req.user._id,
    category: category || '1-on-1',
    rating: Number(rating),
    title,
    comments,
    isSharedWithEmployee: isSharedWithEmployee !== undefined ? isSharedWithEmployee : true
  });

  const populated = await PerformanceNote.findById(note._id)
    .populate('employee', 'firstName lastName employeeId department designation')
    .populate('author', 'firstName lastName employeeId');

  return ApiResponse.success(res, 201, 'Performance note logged successfully.', {
    performanceNote: populated
  });
});

/**
 * @desc    Get performance notes for an employee
 * @route   GET /api/v1/performance/employee/:id
 * @access  Private (Self, Manager of direct report, HR Admin)
 */
const getEmployeePerformanceNotes = asyncHandler(async (req, res, next) => {
  const targetEmployeeId = req.params.id;

  const employee = await User.findById(targetEmployeeId);
  if (!employee) {
    return next(new AppError('Employee not found.', 404));
  }

  const isSelf = req.user._id.toString() === employee._id.toString();
  const isDirectManager =
    req.user.role === 'manager' &&
    employee.reportsTo &&
    employee.reportsTo.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'hr_admin';

  if (!isSelf && !isDirectManager && !isAdmin) {
    return next(
      new AppError('Forbidden: You do not have permission to view this employee’s performance notes.', 403)
    );
  }

  const filter = { employee: targetEmployeeId };

  // If viewing own notes as an employee, only display notes that are explicitly shared
  if (isSelf && !isAdmin && !isDirectManager) {
    filter.isSharedWithEmployee = true;
  }

  const notes = await PerformanceNote.find(filter)
    .populate('author', 'firstName lastName employeeId')
    .sort({ createdAt: -1 });

  return ApiResponse.success(res, 200, 'Performance notes retrieved.', {
    count: notes.length,
    notes
  });
});

/**
 * @desc    Get authenticated employee's shared performance notes
 * @route   GET /api/v1/performance/me
 * @access  Private (Authenticated Employee)
 */
const getMyPerformanceNotes = asyncHandler(async (req, res) => {
  const notes = await PerformanceNote.find({
    employee: req.user._id,
    isSharedWithEmployee: true
  })
    .populate('author', 'firstName lastName employeeId')
    .sort({ createdAt: -1 });

  return ApiResponse.success(res, 200, 'My performance notes retrieved.', {
    count: notes.length,
    notes
  });
});

/**
 * @desc    Update a performance note
 * @route   PUT /api/v1/performance/:id
 * @access  Private (Author, HR Admin)
 */
const updatePerformanceNote = asyncHandler(async (req, res, next) => {
  const note = await PerformanceNote.findById(req.params.id);
  if (!note) {
    return next(new AppError('Performance note not found.', 404));
  }

  const isAuthor = note.author.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'hr_admin';

  if (!isAuthor && !isAdmin) {
    return next(new AppError('Forbidden: You can only edit your own performance notes.', 403));
  }

  const { category, rating, title, comments, isSharedWithEmployee } = req.body;

  if (category) note.category = category;
  if (rating !== undefined) note.rating = Number(rating);
  if (title) note.title = title;
  if (comments) note.comments = comments;
  if (isSharedWithEmployee !== undefined) note.isSharedWithEmployee = isSharedWithEmployee;

  await note.save();

  const updated = await PerformanceNote.findById(note._id)
    .populate('employee', 'firstName lastName employeeId')
    .populate('author', 'firstName lastName employeeId');

  return ApiResponse.success(res, 200, 'Performance note updated successfully.', {
    performanceNote: updated
  });
});

/**
 * @desc    Delete a performance note
 * @route   DELETE /api/v1/performance/:id
 * @access  Private (Author, HR Admin)
 */
const deletePerformanceNote = asyncHandler(async (req, res, next) => {
  const note = await PerformanceNote.findById(req.params.id);
  if (!note) {
    return next(new AppError('Performance note not found.', 404));
  }

  const isAuthor = note.author.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'hr_admin';

  if (!isAuthor && !isAdmin) {
    return next(new AppError('Forbidden: You can only delete your own performance notes.', 403));
  }

  await PerformanceNote.findByIdAndDelete(note._id);

  return ApiResponse.success(res, 200, 'Performance note deleted successfully.');
});

module.exports = {
  createPerformanceNote,
  getEmployeePerformanceNotes,
  getMyPerformanceNotes,
  updatePerformanceNote,
  deletePerformanceNote
};
