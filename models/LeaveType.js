const mongoose = require('mongoose');

const leaveTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Leave type name is required'],
      unique: true,
      trim: true,
      maxlength: [50, 'Leave type name cannot exceed 50 characters']
    },
    code: {
      type: String,
      required: [true, 'Leave code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: [10, 'Leave code cannot exceed 10 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [250, 'Description cannot exceed 250 characters']
    },
    annualQuota: {
      type: Number,
      required: [true, 'Annual quota is required'],
      min: [0, 'Annual quota cannot be negative'],
      default: 12
    },
    isCarryForward: {
      type: Boolean,
      default: false
    },
    isPaid: {
      type: Boolean,
      default: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

const LeaveType = mongoose.model('LeaveType', leaveTypeSchema);

module.exports = LeaveType;
