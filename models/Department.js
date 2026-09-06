const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Department name is required'],
      unique: true,
      trim: true,
      maxlength: [100, 'Department name cannot exceed 100 characters'],
      index: true
    },
    code: {
      type: String,
      required: [true, 'Department code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: [10, 'Department code cannot exceed 10 characters'],
      index: true
    },
    headId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      alias: 'headOfDepartment',
      index: true
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: ''
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for employee count
departmentSchema.virtual('employees', {
  ref: 'User',
  localField: '_id',
  foreignField: 'departmentId'
});

const Department = mongoose.model('Department', departmentSchema);

module.exports = Department;
