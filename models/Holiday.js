const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Holiday name is required'],
      trim: true,
      maxlength: [100, 'Holiday name cannot exceed 100 characters']
    },
    date: {
      type: Date,
      required: [true, 'Holiday date is required'],
      index: true
    },
    year: {
      type: Number,
      required: [true, 'Holiday year is required'],
      index: true
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: ''
    },
    type: {
      type: String,
      enum: {
        values: ['NATIONAL', 'FESTIVAL', 'COMPANY', 'OPTIONAL'],
        message: '{VALUE} is not a valid holiday type'
      },
      default: 'NATIONAL'
    },
    isRestricted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Compound index to ensure uniqueness of holiday on a given date
holidaySchema.index({ date: 1, name: 1 }, { unique: true });

const Holiday = mongoose.model('Holiday', holidaySchema);

module.exports = Holiday;
