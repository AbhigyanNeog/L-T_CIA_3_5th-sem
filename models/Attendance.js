const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Employee reference is required'],
      alias: 'employee',
      index: true
    },
    date: {
      type: Date,
      required: [true, 'Attendance date is required'],
      index: true
    },
    clockIn: {
      type: Date,
      default: null
    },
    clockOut: {
      type: Date,
      default: null
    },
    totalHours: {
      type: Number,
      default: 0,
      min: [0, 'Total hours cannot be negative']
    },
    status: {
      type: String,
      enum: {
        values: ['PRESENT', 'HALF_DAY', 'ABSENT', 'LATE', 'ON_LEAVE'],
        message: '{VALUE} is not a valid attendance status'
      },
      default: 'ABSENT',
      index: true
    },
    ipAddress: {
      type: String,
      default: ''
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [250, 'Notes cannot exceed 250 characters'],
      default: ''
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound unique index: Enforces single attendance record per employee per calendar date
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
