const mongoose = require('mongoose');

const designationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Designation title is required'],
      trim: true
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department reference is required'],
      index: true
    },
    level: {
      type: Number,
      required: [true, 'Designation level is required'],
      min: 1,
      max: 10
    },
    minSalary: {
      type: Number,
      default: 0
    },
    maxSalary: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    strictPopulate: false
  }
);

const Designation = mongoose.model('Designation', designationSchema);

module.exports = Designation;