const mongoose = require('mongoose');
const AppError = require('../utils/appError');

/**
 * Validates that required fields are present and non-empty in req.body
 * @param {Array<string>} requiredFields - Array of required field names
 */
const requireFields = (requiredFields) => {
  return (req, res, next) => {
    const missingFields = requiredFields.filter((field) => {
      const val = req.body[field];
      return val === undefined || val === null || (typeof val === 'string' && val.trim() === '');
    });

    if (missingFields.length > 0) {
      return next(
        new AppError(
          `Validation failed: Missing required field(s): ${missingFields.join(', ')}`,
          400,
          missingFields.map((f) => ({ field: f, message: `${f} is required and cannot be empty.` })),
          'MISSING_REQUIRED_FIELDS'
        )
      );
    }

    next();
  };
};

/**
 * Validates that specified route parameters or body fields are valid MongoDB ObjectIds
 * @param {Array<string>} paramOrFieldNames - Array of parameter or body field names to check
 * @param {'params'|'body'|'query'} source - Source of the field (default: 'params')
 */
const validateObjectId = (paramOrFieldNames, source = 'params') => {
  return (req, res, next) => {
    const invalidIds = [];

    for (const name of paramOrFieldNames) {
      const val = req[source][name];
      if (val && !mongoose.Types.ObjectId.isValid(val)) {
        invalidIds.push({
          field: name,
          value: val,
          message: `Invalid ObjectId format for '${name}': '${val}'. Must be a valid 24-character hexadecimal string.`
        });
      }
    }

    if (invalidIds.length > 0) {
      return next(
        new AppError(
          `Validation failed: ${invalidIds.map((i) => i.message).join('; ')}`,
          400,
          invalidIds,
          'INVALID_ID'
        )
      );
    }

    next();
  };
};

/**
 * Validates that date strings in req.body are valid parseable dates
 * @param {Array<string>} dateFields - Array of date field names
 */
const validateDates = (dateFields) => {
  return (req, res, next) => {
    const invalidDates = [];

    for (const field of dateFields) {
      const val = req.body[field];
      if (val !== undefined && val !== null && val !== '') {
        const timestamp = Date.parse(val);
        if (isNaN(timestamp)) {
          invalidDates.push({
            field,
            value: val,
            message: `Invalid date format for field '${field}': '${val}'. Must be a valid ISO-8601 date string (YYYY-MM-DD).`
          });
        }
      }
    }

    if (invalidDates.length > 0) {
      return next(
        new AppError(
          `Date validation error: ${invalidDates.map((d) => d.message).join('; ')}`,
          400,
          invalidDates,
          'INVALID_DATE'
        )
      );
    }

    next();
  };
};

/**
 * Validates date chronological order: startField must be <= endField
 */
const validateDateRange = (startField, endField) => {
  return (req, res, next) => {
    const startVal = req.body[startField];
    const endVal = req.body[endField];

    if (startVal && endVal) {
      const startDate = new Date(startVal);
      const endDate = new Date(endVal);

      if (startDate > endDate) {
        return next(
          new AppError(
            `Invalid date span: '${startField}' (${startVal}) cannot be after '${endField}' (${endVal}).`,
            400,
            [{ field: startField, message: `${startField} must be earlier than or equal to ${endField}.` }],
            'INVALID_DATE_RANGE'
          )
        );
      }
    }

    next();
  };
};

/**
 * Validates that a string value belongs to an allowed enumeration set
 * @param {string} fieldName - Target field name
 * @param {Array<string>} allowedValues - Permitted string values
 */
const validateEnum = (fieldName, allowedValues) => {
  return (req, res, next) => {
    const val = req.body[fieldName];
    if (val !== undefined && val !== null) {
      const normalized = typeof val === 'string' ? val.toUpperCase() : val;
      if (!allowedValues.includes(normalized)) {
        return next(
          new AppError(
            `Invalid enum value for '${fieldName}': '${val}'. Permitted options: ${allowedValues.join(', ')}.`,
            400,
            [{ field: fieldName, message: `Permitted options: ${allowedValues.join(', ')}` }],
            'INVALID_ENUM_VALUE'
          )
        );
      }
    }

    next();
  };
};

module.exports = {
  requireFields,
  validateObjectId,
  validateDates,
  validateDateRange,
  validateEnum
};
