const Department = require('../models/Department');
const User = require('../models/User');
const AppError = require('../utils/appError');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Create a new department
 * @route   POST /api/v1/departments
 * @access  Private (HR Admin)
 */
const createDepartment = asyncHandler(async (req, res, next) => {
  const { name, code, description, headOfDepartment } = req.body;

  // Check for duplicate name or code
  const existingDept = await Department.findOne({
    $or: [{ name: new RegExp(`^${name}$`, 'i') }, { code: code.toUpperCase() }]
  });

  if (existingDept) {
    return next(new AppError('Department with this name or code already exists.', 409));
  }

  // Validate headOfDepartment if supplied
  if (headOfDepartment) {
    const managerUser = await User.findById(headOfDepartment);
    if (!managerUser) {
      return next(new AppError('Assigned Head of Department user does not exist.', 404));
    }
  }

  const department = await Department.create({
    name,
    code: code.toUpperCase(),
    description,
    headOfDepartment: headOfDepartment || null
  });

  return ApiResponse.success(res, 201, 'Department created successfully.', {
    department
  });
});

/**
 * @desc    Get all departments
 * @route   GET /api/v1/departments
 * @access  Private (All authenticated roles)
 */
const getAllDepartments = asyncHandler(async (req, res) => {
  const { search, isActive } = req.query;
  const filter = {};

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } }
    ];
  }

  if (isActive !== undefined) {
    filter.isActive = isActive === 'true';
  }

  const departments = await Department.find(filter)
    .populate('headOfDepartment', 'firstName lastName employeeId email')
    .sort({ name: 1 });

  // Add active employee count for each department
  const deptsWithCount = await Promise.all(
    departments.map(async (dept) => {
      const employeeCount = await User.countDocuments({
        department: dept._id,
        status: 'active'
      });
      const deptObj = dept.toObject();
      deptObj.employeeCount = employeeCount;
      return deptObj;
    })
  );

  return ApiResponse.success(res, 200, 'Departments retrieved successfully.', {
    departments: deptsWithCount
  });
});

/**
 * @desc    Get department by ID
 * @route   GET /api/v1/departments/:id
 * @access  Private (All authenticated roles)
 */
const getDepartmentById = asyncHandler(async (req, res, next) => {
  const department = await Department.findById(req.params.id).populate(
    'headOfDepartment',
    'firstName lastName employeeId email'
  );

  if (!department) {
    return next(new AppError('Department not found.', 404));
  }

  const employeeCount = await User.countDocuments({
    department: department._id,
    status: 'active'
  });

  const deptData = department.toObject();
  deptData.employeeCount = employeeCount;

  return ApiResponse.success(res, 200, 'Department retrieved successfully.', {
    department: deptData
  });
});

/**
 * @desc    Update department details
 * @route   PUT /api/v1/departments/:id
 * @access  Private (HR Admin)
 */
const updateDepartment = asyncHandler(async (req, res, next) => {
  const { name, code, description, headOfDepartment, isActive } = req.body;

  const department = await Department.findById(req.params.id);
  if (!department) {
    return next(new AppError('Department not found.', 404));
  }

  // Check code/name collision if modified
  if (name && name.toLowerCase() !== department.name.toLowerCase()) {
    const existingName = await Department.findOne({
      name: new RegExp(`^${name}$`, 'i'),
      _id: { $ne: department._id }
    });
    if (existingName) {
      return next(new AppError('Another department with this name already exists.', 409));
    }
    department.name = name;
  }

  if (code && code.toUpperCase() !== department.code) {
    const existingCode = await Department.findOne({
      code: code.toUpperCase(),
      _id: { $ne: department._id }
    });
    if (existingCode) {
      return next(new AppError('Another department with this code already exists.', 409));
    }
    department.code = code.toUpperCase();
  }

  if (description !== undefined) department.description = description;
  if (headOfDepartment !== undefined) department.headOfDepartment = headOfDepartment || null;
  if (isActive !== undefined) department.isActive = isActive;

  await department.save();

  const updatedDept = await Department.findById(department._id).populate(
    'headOfDepartment',
    'firstName lastName employeeId email'
  );

  return ApiResponse.success(res, 200, 'Department updated successfully.', {
    department: updatedDept
  });
});

/**
 * @desc    Delete department with referential integrity guard
 * @route   DELETE /api/v1/departments/:id
 * @access  Private (HR Admin)
 */
const deleteDepartment = asyncHandler(async (req, res, next) => {
  const department = await Department.findById(req.params.id);
  if (!department) {
    return next(new AppError('Department not found.', 404));
  }

  // Check for assigned active employees to maintain referential integrity
  const activeEmployeeCount = await User.countDocuments({
    department: department._id,
    status: 'active'
  });

  if (activeEmployeeCount > 0) {
    return next(
      new AppError(
        `Cannot delete department: There are ${activeEmployeeCount} active employee(s) assigned to it. Please reassign employees first.`,
        409
      )
    );
  }

  await Department.findByIdAndDelete(department._id);

  return ApiResponse.success(res, 200, 'Department deleted successfully.');
});

module.exports = {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment
};
