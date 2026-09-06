const mongoose = require('mongoose');

const designationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Designation title is required'],
      unique: true,
      trim: true,
      maxlength: [100, 'Designation title cannot exceed 100 characters'],
      index: true
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department reference is required'],
      alias: 'department',
      index: true
    },
    level: {
      type: Number,
      default: 1,
      min: [1, 'Hierarchy level must be at least 1'],
      max: [10, 'Hierarchy level cannot exceed 10'],
      index: true
    },
    minSalary: {
      type: Number,
      default: 0,
      min: [0, 'Minimum salary cannot be negative']
    },
    maxSalary: {
      type: Number,
      default: 0,
      validate: {
        validator: function (value) {
          return value >= this.minSalary;
        },
        message: 'Maximum salary must be greater than or equal to minimum salary'
      }
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

const Designation = mongoose.model('Designation', designationSchema);

module.exports = Designation;
