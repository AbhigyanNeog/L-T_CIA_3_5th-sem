const mongoose = require('mongoose');

const performanceNoteSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Target employee reference is required'],
      alias: 'employee',
      index: true
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author reference is required'],
      alias: 'author',
      index: true
    },
    category: {
      type: String,
      enum: {
        values: [
          '1-on-1',
          'Quarterly Review',
          'Annual Review',
          'Commendation',
          'PIP',
          'General Note'
        ],
        message: '{VALUE} is not a valid review category'
      },
      default: '1-on-1'
    },
    rating: {
      type: Number,
      required: [true, 'Performance rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
      index: true
    },
    title: {
      type: String,
      required: [true, 'Note title is required'],
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters']
    },
    comments: {
      type: String,
      required: [true, 'Review feedback / comments are required'],
      trim: true,
      maxlength: [2000, 'Comments cannot exceed 2000 characters']
    },
    isSharedWithEmployee: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound index for querying employee reviews by date
performanceNoteSchema.index({ employeeId: 1, createdAt: -1 });

const PerformanceNote = mongoose.model('PerformanceNote', performanceNoteSchema);

module.exports = PerformanceNote;
