const Holiday = require('../models/Holiday');
const AppError = require('../utils/appError');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Normalizes a date to midnight UTC
 */
const normalizeDate = (dateString) => {
  const d = new Date(dateString);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

/**
 * @desc    Create a new holiday
 * @route   POST /api/v1/holidays
 * @access  Private (HR Admin)
 */
const createHoliday = asyncHandler(async (req, res, next) => {
  const { name, date, type, description, isRestricted } = req.body;

  const normalized = normalizeDate(date);
  const year = normalized.getUTCFullYear();

  const existing = await Holiday.findOne({ date: normalized, name });
  if (existing) {
    return next(new AppError('A holiday with this name and date already exists.', 409));
  }

  const holiday = await Holiday.create({
    name,
    date: normalized,
    year,
    type: type || 'NATIONAL',
    description: description || '',
    isRestricted: isRestricted || false
  });

  return ApiResponse.success(res, 201, 'Holiday created successfully.', { holiday });
});

/**
 * @desc    Get all holidays (filtered by year / type)
 * @route   GET /api/v1/holidays
 * @access  Private (All authenticated roles)
 */
const getAllHolidays = asyncHandler(async (req, res) => {
  const { year, type, isRestricted } = req.query;
  const filter = {};

  if (year) {
    filter.year = Number(year);
  } else {
    // Default to current calendar year if not provided
    filter.year = new Date().getUTCFullYear();
  }

  if (type) filter.type = type.toUpperCase();
  if (isRestricted !== undefined) filter.isRestricted = isRestricted === 'true';

  const holidays = await Holiday.find(filter).sort({ date: 1 });

  return ApiResponse.success(res, 200, 'Holidays retrieved successfully.', {
    count: holidays.length,
    year: filter.year,
    holidays
  });
});

/**
 * @desc    Get holiday by ID
 * @route   GET /api/v1/holidays/:id
 * @access  Private (All authenticated roles)
 */
const getHolidayById = asyncHandler(async (req, res, next) => {
  const holiday = await Holiday.findById(req.params.id);
  if (!holiday) {
    return next(new AppError('Holiday not found.', 404));
  }

  return ApiResponse.success(res, 200, 'Holiday details retrieved successfully.', { holiday });
});

/**
 * @desc    Update holiday details
 * @route   PUT /api/v1/holidays/:id
 * @access  Private (HR Admin)
 */
const updateHoliday = asyncHandler(async (req, res, next) => {
  const { name, date, type, description, isRestricted } = req.body;

  const holiday = await Holiday.findById(req.params.id);
  if (!holiday) {
    return next(new AppError('Holiday not found.', 404));
  }

  if (name) holiday.name = name;
  if (date) {
    const normalized = normalizeDate(date);
    holiday.date = normalized;
    holiday.year = normalized.getUTCFullYear();
  }
  if (type) holiday.type = type.toUpperCase();
  if (description !== undefined) holiday.description = description;
  if (isRestricted !== undefined) holiday.isRestricted = isRestricted;

  await holiday.save();

  return ApiResponse.success(res, 200, 'Holiday updated successfully.', { holiday });
});

/**
 * @desc    Delete holiday
 * @route   DELETE /api/v1/holidays/:id
 * @access  Private (HR Admin)
 */
const deleteHoliday = asyncHandler(async (req, res, next) => {
  const holiday = await Holiday.findByIdAndDelete(req.params.id);
  if (!holiday) {
    return next(new AppError('Holiday not found.', 404));
  }

  return ApiResponse.success(res, 200, 'Holiday deleted successfully.');
});

module.exports = {
  createHoliday,
  getAllHolidays,
  getHolidayById,
  updateHoliday,
  deleteHoliday
};
