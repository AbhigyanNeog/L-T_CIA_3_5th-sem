const User = require('../models/User');
const Department = require('../models/Department');
const Designation = require('../models/Designation');
const LeaveBalance = require('../models/LeaveBalance');
const AppError = require('../utils/appError');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Helper to generate sequential or unique Employee ID
 */
const generateUniqueEmployeeId = async () => {
  const count = await User.countDocuments();
  const nextNum = String(count + 1).padStart(4, '0');
  let candidateId = `EMP-${nextNum}`;

  let exists = await User.findOne({ employeeId: candidateId });
  let attempts = 1;
  while (exists) {
    candidateId = `EMP-${String(count + 1 + attempts).padStart(4, '0')}`;
    exists = await User.findOne({ employeeId: candidateId });
    attempts++;
  }

  return candidateId;
};

/**
 * @desc    Onboard a new employee (HR Admin only)
 * @route   POST /api/v1/employees/onboard or POST /api/v1/employees/register
 * @access  Private (HR Admin)
 */
const onboardEmployee = asyncHandler(async (req, res, next) => {
  const {
    employeeId,
    name,
    firstName,
    lastName,
    email,
    password,
    passwordHash,
    role,
    department,
    departmentId,
    designation,
    designationId,
    reportsTo,
    managerId,
    joiningDate,
    baseSalary,
    phone,
    address,
    emergencyContact
  } = req.body;

  if (!email) {
    return next(new AppError('Employee email address is required.', 400));
  }

  // Check for email collision
  const existingEmail = await User.findOne({ email: email.toLowerCase() });
  if (existingEmail) {
    return next(new AppError('An employee with this email address already exists.', 409));
  }

  // Determine Employee Name
  let finalName = name;
  if (!finalName && (firstName || lastName)) {
    finalName = `${firstName || ''} ${lastName || ''}`.trim();
  }
  if (!finalName) {
    finalName = email.split('@')[0];
  }

  // Determine Employee ID
  let finalEmployeeId = employeeId;
  if (!finalEmployeeId) {
    finalEmployeeId = await generateUniqueEmployeeId();
  } else {
    const existingId = await User.findOne({ employeeId: finalEmployeeId.toUpperCase() });
    if (existingId) {
      return next(new AppError('Employee ID already in use.', 409));
    }
  }

  const finalDeptId = departmentId || department;
  const finalDesigId = designationId || designation;
  const finalManagerId = managerId || reportsTo;

  // Validate department if provided
  if (finalDeptId) {
    const deptDoc = await Department.findById(finalDeptId);
    if (!deptDoc) {
      return next(new AppError('Assigned Department does not exist.', 404));
    }
  }

  // Validate designation if provided
  if (finalDesigId) {
    const desigDoc = await Designation.findById(finalDesigId);
    if (!desigDoc) {
      return next(new AppError('Assigned Designation does not exist.', 404));
    }
  }

  // Validate manager if provided
  if (finalManagerId) {
    const managerDoc = await User.findById(finalManagerId);
    if (!managerDoc) {
      return next(new AppError('Assigned reporting manager does not exist.', 404));
    }
  }

  // Create User (passwordHash will be hashed by User pre-save hook)
  const plainPassword = password || passwordHash || 'Emp@123456';
  const newEmployee = await User.create({
    employeeId: finalEmployeeId.toUpperCase(),
    name: finalName,
    email: email.toLowerCase(),
    passwordHash: plainPassword,
    role: role || 'employee',
    departmentId: finalDeptId || null,
    designationId: finalDesigId || null,
    managerId: finalManagerId || null,
    joiningDate: joiningDate || Date.now(),
    baseSalary: baseSalary || 0,
    phone: phone || '',
    address: address || {},
    emergencyContact: emergencyContact || {}
  });

  // Auto-provision initial LeaveBalance quotas for current calendar year
  const currentYear = new Date().getUTCFullYear();
  await LeaveBalance.findOneAndUpdate(
    { employeeId: newEmployee._id, year: currentYear },
    {
      $setOnInsert: {
        employeeId: newEmployee._id,
        year: currentYear,
        casual: { allocated: 12, used: 0, remaining: 12 },
        sick: { allocated: 10, used: 0, remaining: 10 },
        earned: { allocated: 15, used: 0, remaining: 15 }
      }
    },
    { upsert: true, new: true }
  );

  const populated = await User.findById(newEmployee._id)
    .populate('departmentId', 'name code')
    .populate('designationId', 'title level')
    .populate('managerId', 'name employeeId email');

  return ApiResponse.success(res, 201, 'Employee successfully onboarded and leave balance provisioned.', {
    employee: populated
  });
});

/**
 * @desc    Get all employees with filters and pagination
 * @route   GET /api/v1/employees
 * @access  Private (HR Admin, Manager)
 */
const getAllEmployees = asyncHandler(async (req, res) => {
  const {
    department,
    designation,
    role,
    status,
    reportsTo,
    search,
    page = 1,
    limit = 50
  } = req.query;

  const filter = {};

  if (department) filter.department = department;
  if (designation) filter.designation = designation;
  if (role) filter.role = role;
  if (status) filter.status = status;
  if (reportsTo) filter.reportsTo = reportsTo;

  // Managers can view direct reports or company if permitted
  if (req.user.role === 'manager' && req.query.teamOnly === 'true') {
    filter.reportsTo = req.user._id;
  }

  if (search) {
    filter.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { employeeId: { $regex: search, $options: 'i' } }
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [employees, total] = await Promise.all([
    User.find(filter)
      .populate('department', 'name code')
      .populate('designation', 'title level')
      .populate('reportsTo', 'firstName lastName employeeId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    User.countDocuments(filter)
  ]);

  return ApiResponse.success(res, 200, 'Employees retrieved successfully.', {
    employees,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum)
    }
  });
});

/**
 * @desc    Get employee details by ID
 * @route   GET /api/v1/employees/:id
 * @access  Private (Self, Manager of direct report, HR Admin)
 */
const getEmployeeById = asyncHandler(async (req, res, next) => {
  const employee = await User.findById(req.params.id)
    .populate('department', 'name code headOfDepartment')
    .populate('designation', 'title level minSalary maxSalary')
    .populate('reportsTo', 'firstName lastName employeeId email');

  if (!employee) {
    return next(new AppError('Employee not found.', 404));
  }

  // Authorization check: Self, Manager of this employee, or HR Admin
  const isSelf = req.user._id.toString() === employee._id.toString();
  const isManager =
    req.user.role === 'manager' &&
    employee.reportsTo &&
    employee.reportsTo._id.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'hr_admin';

  if (!isSelf && !isManager && !isAdmin) {
    return next(
      new AppError('Forbidden: You do not have permission to view this employee profile.', 403)
    );
  }

  return ApiResponse.success(res, 200, 'Employee details retrieved successfully.', {
    employee
  });
});

/**
 * @desc    Update employee administrative data
 * @route   PUT /api/v1/employees/:id
 * @access  Private (HR Admin)
 */
const updateEmployee = asyncHandler(async (req, res, next) => {
  const {
    firstName,
    lastName,
    role,
    department,
    designation,
    reportsTo,
    baseSalary,
    status,
    phone,
    address,
    emergencyContact
  } = req.body;

  const employee = await User.findById(req.params.id);
  if (!employee) {
    return next(new AppError('Employee not found.', 404));
  }

  if (department) {
    const deptDoc = await Department.findById(department);
    if (!deptDoc) {
      return next(new AppError('Assigned Department does not exist.', 404));
    }
    employee.department = department;
  }

  if (designation) {
    const desigDoc = await Designation.findById(designation);
    if (!desigDoc) {
      return next(new AppError('Assigned Designation does not exist.', 404));
    }
    employee.designation = designation;
  }

  if (reportsTo !== undefined) {
    if (reportsTo) {
      const managerDoc = await User.findById(reportsTo);
      if (!managerDoc) {
        return next(new AppError('Assigned manager does not exist.', 404));
      }
    }
    employee.reportsTo = reportsTo || null;
  }

  if (firstName) employee.firstName = firstName;
  if (lastName) employee.lastName = lastName;
  if (role) employee.role = role;
  if (baseSalary !== undefined) employee.baseSalary = Number(baseSalary);
  if (status) employee.status = status;
  if (phone !== undefined) employee.phone = phone;
  if (address) employee.address = { ...employee.address, ...address };
  if (emergencyContact) employee.emergencyContact = { ...employee.emergencyContact, ...emergencyContact };

  await employee.save();

  const updated = await User.findById(employee._id)
    .populate('department', 'name code')
    .populate('designation', 'title level')
    .populate('reportsTo', 'firstName lastName employeeId');

  return ApiResponse.success(res, 200, 'Employee updated successfully.', {
    employee: updated
  });
});

/**
 * @desc    Update employee self-service contact details
 * @route   PATCH /api/v1/employees/me
 * @access  Private (Authenticated Employee)
 */
const updateMyProfile = asyncHandler(async (req, res, next) => {
  const restrictedFields = [
    'role',
    'salary',
    'baseSalary',
    'department',
    'departmentId',
    'manager',
    'managerId',
    'reportsTo',
    'password',
    'passwordHash',
    'employeeId'
  ];

  const attemptedRestricted = restrictedFields.filter((f) => req.body[f] !== undefined);
  if (attemptedRestricted.length > 0) {
    return next(
      new AppError(
        `Forbidden: Employees are not permitted to modify restricted fields (${attemptedRestricted.join(', ')}). Contact HR for administrative modifications.`,
        403
      )
    );
  }

  const { phone, address, emergencyContact } = req.body;
  const employee = await User.findById(req.user._id);

  if (phone !== undefined) employee.phone = phone;
  if (address) employee.address = { ...employee.address, ...address };
  if (emergencyContact) {
    employee.emergencyContact = { ...employee.emergencyContact, ...emergencyContact };
  }

  await employee.save();

  const updated = await User.findById(employee._id)
    .populate('departmentId', 'name code')
    .populate('designationId', 'title level')
    .populate('managerId', 'name employeeId email');

  return ApiResponse.success(res, 200, 'Profile updated successfully.', {
    employee: updated
  });
});

module.exports = {
  onboardEmployee,
  registerEmployee: onboardEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  updateMyProfile
};
