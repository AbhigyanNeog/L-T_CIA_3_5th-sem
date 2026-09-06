const mongoose = require('mongoose');

const quotaBucketSchema = new mongoose.Schema(
  {
    allocated: { type: Number, default: 0, min: 0 },
    used: { type: Number, default: 0, min: 0 },
    remaining: { type: Number, default: 0, min: 0 }
  },
  { _id: false }
);

const leaveBalanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Employee reference is required'],
      alias: 'employee',
      index: true
    },
    year: {
      type: Number,
      required: [true, 'Calendar year is required'],
      default: () => new Date().getUTCFullYear(),
      index: true
    },
    casual: {
      type: quotaBucketSchema,
      default: () => ({ allocated: 12, used: 0, remaining: 12 })
    },
    sick: {
      type: quotaBucketSchema,
      default: () => ({ allocated: 10, used: 0, remaining: 10 })
    },
    earned: {
      type: quotaBucketSchema,
      default: () => ({ allocated: 15, used: 0, remaining: 15 })
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Pre-save hook: Enforce remaining = Math.max(0, allocated - used)
leaveBalanceSchema.pre('save', function (next) {
  if (this.casual) {
    this.casual.remaining = Math.max(0, (this.casual.allocated || 0) - (this.casual.used || 0));
  }
  if (this.sick) {
    this.sick.remaining = Math.max(0, (this.sick.allocated || 0) - (this.sick.used || 0));
  }
  if (this.earned) {
    this.earned.remaining = Math.max(0, (this.earned.allocated || 0) - (this.earned.used || 0));
  }
  next();
});

// Compound unique index: Only 1 annual balance ledger per employee per calendar year
leaveBalanceSchema.index({ employeeId: 1, year: 1 }, { unique: true });

const LeaveBalance = mongoose.model('LeaveBalance', leaveBalanceSchema);

module.exports = LeaveBalance;
