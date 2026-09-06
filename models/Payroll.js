const mongoose = require('mongoose');

const allowanceSchema = new mongoose.Schema(
  {
    hra: { type: Number, default: 0 },
    da: { type: Number, default: 0 },
    special: { type: Number, default: 0 },
    medical: { type: Number, default: 0 }
  },
  { _id: false }
);

const deductionSchema = new mongoose.Schema(
  {
    pf: { type: Number, default: 0 },
    professionalTax: { type: Number, default: 0 },
    tds: { type: Number, default: 0 },
    lopDeduction: { type: Number, default: 0 }
  },
  { _id: false }
);

const payrollSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Employee reference is required'],
      alias: 'employee',
      index: true
    },
    month: {
      type: Number,
      required: [true, 'Payroll month is required'],
      min: 1,
      max: 12,
      alias: 'payPeriodMonth',
      index: true
    },
    year: {
      type: Number,
      required: [true, 'Payroll year is required'],
      alias: 'payPeriodYear',
      index: true
    },
    baseSalary: {
      type: Number,
      required: [true, 'Base salary is required'],
      min: 0,
      alias: 'baseSalarySnapshot'
    },
    allowances: {
      type: allowanceSchema,
      default: () => ({ hra: 0, da: 0, special: 0, medical: 0 })
    },
    grossPay: {
      type: Number,
      required: true,
      min: 0,
      alias: 'grossEarnings'
    },
    deductions: {
      type: deductionSchema,
      default: () => ({ pf: 0, professionalTax: 0, tds: 0, lopDeduction: 0 })
    },
    totalDeductions: {
      type: Number,
      required: true,
      min: 0
    },
    netPay: {
      type: Number,
      required: true,
      min: 0,
      alias: 'netSalary'
    },
    totalWorkingDays: {
      type: Number,
      required: true,
      default: 22
    },
    daysPresent: {
      type: Number,
      default: 0
    },
    lopDays: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: {
        values: ['DRAFT', 'PROCESSED', 'PAID'],
        message: '{VALUE} is not a valid payroll status'
      },
      default: 'PROCESSED',
      alias: 'paymentStatus',
      index: true
    },
    paymentDate: {
      type: Date,
      default: null
    },
    transactionReference: {
      type: String,
      trim: true,
      default: ''
    },
    remarks: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound unique index: Only 1 payroll record per employee per month & year
payrollSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });

const Payroll = mongoose.model('Payroll', payrollSchema);

module.exports = Payroll;
