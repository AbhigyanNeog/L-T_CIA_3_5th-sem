const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Employee reference is required'],
      alias: 'employee',
      index: true
    },
    type: {
      type: String,
      enum: {
        values: ['CASUAL', 'SICK', 'EARNED', 'UNPAID'],
        message: '{VALUE} is not a valid leave type'
      },
      required: [true, 'Leave type is required'],
      index: true
    },
    fromDate: {
      type: Date,
      required: [true, 'Start date (fromDate) is required'],
      alias: 'startDate',
      index: true
    },
    toDate: {
      type: Date,
      required: [true, 'End date (toDate) is required'],
      alias: 'endDate',
      index: true
    },
    totalDays: {
      type: Number,
      required: [true, 'Total days count is required'],
      min: [0.5, 'Leave duration must be at least 0.5 days']
    },
    reason: {
      type: String,
      required: [true, 'Reason for leave is required'],
      trim: true,
      maxlength: [500, 'Reason cannot exceed 500 characters']
    },
    status: {
      type: String,
      enum: {
        values: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'],
        message: '{VALUE} is not a valid leave status'
      },
      default: 'PENDING',
      index: true
    },
    approverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      alias: 'reviewedBy',
      index: true
    },
    remarks: {
      type: String,
      trim: true,
      default: '',
      alias: 'reviewRemarks'
    },
    reviewedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound index for efficient overlap detection and manager queries
leaveRequestSchema.index({ employeeId: 1, status: 1, fromDate: 1, toDate: 1 });

const LeaveRequest = mongoose.model('LeaveRequest', leaveRequestSchema);

module.exports = LeaveRequest;
