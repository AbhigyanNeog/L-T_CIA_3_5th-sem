const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Employee name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address'
      ]
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      select: false,
      alias: 'password'
    },
    role: {
      type: String,
      enum: {
        values: ['employee', 'manager', 'hr_admin'],
        message: '{VALUE} is not a valid user role'
      },
      default: 'employee',
      index: true
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
      alias: 'department',
      index: true
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      alias: 'reportsTo',
      index: true
    },
    designationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Designation',
      default: null,
      alias: 'designation',
      index: true
    },
    joiningDate: {
      type: Date,
      default: Date.now
    },
    baseSalary: {
      type: Number,
      default: 0,
      min: [0, 'Base salary cannot be negative']
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'inactive', 'terminated'],
        message: '{VALUE} is not a valid status'
      },
      default: 'active',
      index: true
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    address: {
      street: { type: String, trim: true, default: '' },
      city: { type: String, trim: true, default: '' },
      state: { type: String, trim: true, default: '' },
      postalCode: { type: String, trim: true, default: '' },
      country: { type: String, trim: true, default: '' }
    },
    emergencyContact: {
      name: { type: String, trim: true, default: '' },
      relationship: { type: String, trim: true, default: '' },
      phone: { type: String, trim: true, default: '' }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual split for firstName & lastName if needed by legacy callers
userSchema.virtual('firstName').get(function () {
  return this.name ? this.name.split(' ')[0] : '';
});

userSchema.virtual('lastName').get(function () {
  if (!this.name) return '';
  const parts = this.name.split(' ');
  return parts.slice(1).join(' ') || '';
});

userSchema.virtual('fullName').get(function () {
  return this.name;
});

// Pre-save hook: Hash password with bcrypt before saving to MongoDB
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) {
    return next();
  }

  const salt = await bcrypt.genSalt(12);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  next();
});

// Instance method: Verify candidate password against passwordHash
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Instance method: Generate cryptographically signed JWT access token
userSchema.methods.generateAuthToken = function () {
  return jwt.sign(
    {
      id: this._id,
      employeeId: this.employeeId,
      email: this.email,
      role: this.role
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    }
  );
};

const User = mongoose.model('User', userSchema);

module.exports = User;
