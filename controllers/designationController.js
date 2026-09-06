const Designation = require('../models/Designation');
const Department = require('../models/Department');
const User = require('../models/User');
const AppError = require('../utils/appError');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Create a new designation
 * @route   POST /api/v1/designations
 * @access  Private (HR Admin)
 */
const createDesignation = asyncHandler(async (req, res, next) => {
  const { title, department, level, minSalary, maxSalary, description } = req.body;

  // Validate department exists
  const deptExists = await Department.findById(department);
  if (!deptExists) {
    return next(new AppError('Assigned Department does not exist.', 404));
  }

  // Check for duplicate designation title
  const existingTitle = await Designation.findOne({
    title: new RegExp(`^${title}$`, 'i')
  });
  if (existingTitle) {
    return next(new AppError('Designation with this title already exists.', 409));
  }

  if (minSalary && maxSalary && Number(minSalary) > Number(maxSalary)) {
    return next(new AppError('Minimum salary cannot exceed maximum salary.', 400));
  }

  const designation = await Designation.create({
    title,
    department,
    level: level || 1,
    minSalary: minSalary || 0,
    maxSalary: maxSalary || 0,
    description
  });

  const populated = await Designation.findById(designation._id).populate('department', 'name code');

  return ApiResponse.success(res, 201, 'Designation created successfully.', {
    designation: populated
  });
});

/**
 * @desc    Get all designations
 * @route   GET /api/v1/designations
 * @access  Private (All authenticated roles)
 */
const getAllDesignations = asyncHandler(async (req, res) => {
  const { department, level, search, isActive } = req.query;
  const filter = {};

  if (department) filter.department = department;
  if (level) filter.level = Number(level);
  if (isActive !== undefined) filter.isActive = isActive === 'true';
  if (search) filter.title = { $regex: search, $options: 'i' };

  const designations = await Designation.find(filter)
    .populate('department', 'name code')
    .sort({ level: 1, title: 1 });

  return ApiResponse.success(res, 200, 'Designations retrieved successfully.', {
    designations
  });
});

/**
 * @desc    Get designation by ID
 * @route   GET /api/v1/designations/:id
 * @access  Private (All authenticated roles)
 */
const getDesignationById = asyncHandler(async (req, res, next) => {
  const designation = await Designation.findById(req.params.id).populate('department', 'name code');

  if (!designation) {
    return next(new AppError('Designation not found.', 404));
  }

  return ApiResponse.success(res, 200, 'Designation retrieved successfully.', {
    designation
  });
});

/**
 * @desc    Update designation details
 * @route   PUT /api/v1/designations/:id
 * @access  Private (HR Admin)
 */
const updateDesignation = asyncHandler(async (req, res, next) => {
  const { title, department, level, minSalary, maxSalary, description, isActive } = req.body;

  const designation = await Designation.findById(req.params.id);
  if (!designation) {
    return next(new AppError('Designation not found.', 404));
  }

  if (department) {
    const deptExists = await Department.findById(department);
    if (!deptExists) {
      return next(new AppError('Assigned Department does not exist.', 404));
    }
    designation.department = department;
  }

  if (title && title.toLowerCase() !== designation.title.toLowerCase()) {
    const existingTitle = await Designation.findOne({
      title: new RegExp(`^${title}$`, 'i'),
      _id: { $ne: designation._id }
    });
    if (existingTitle) {
      return next(new AppError('Another designation with this title already exists.', 409));
    }
    designation.title = title;
  }

  const effectiveMin = minSalary !== undefined ? Number(minSalary) : designation.minSalary;
  const effectiveMax = maxSalary !== undefined ? Number(maxSalary) : designation.maxSalary;

  if (effectiveMin > effectiveMax) {
    return next(new AppError('Minimum salary cannot exceed maximum salary.', 400));
  }

  if (level !== undefined) designation.level = Number(level);
  if (minSalary !== undefined) designation.minSalary = effectiveMin;
  if (maxSalary !== undefined) designation.maxSalary = effectiveMax;
  if (description !== undefined) designation.description = description;
  if (isActive !== undefined) designation.isActive = isActive;

  await designation.save();

  const updated = await Designation.findById(designation._id).populate('department', 'name code');

  return ApiResponse.success(res, 200, 'Designation updated successfully.', {
    designation: updated
  });
});

/**
 * @desc    Delete designation with referential integrity guard
 * @route   DELETE /api/v1/designations/:id
 * @access  Private (HR Admin)
 */
const deleteDesignation = asyncHandler(async (req, res, next) => {
  const designation = await Designation.findById(req.params.id);
  if (!designation) {
    return next(new AppError('Designation not found.', 404));
  }

  const activeEmployeeCount = await User.countDocuments({
    designation: designation._id,
    status: 'active'
  });

  if (activeEmployeeCount > 0) {
    return next(
      new AppError(
        `Cannot delete designation: There are ${activeEmployeeCount} active employee(s) holding this title. Please reassign them first.`,
        409
      )
    );
  }

  await Designation.findByIdAndDelete(designation._id);

  return ApiResponse.success(res, 200, 'Designation deleted successfully.');
});

module.exports = {
  createDesignation,
  getAllDesignations,
  getDesignationById,
  updateDesignation,
  deleteDesignation
};
