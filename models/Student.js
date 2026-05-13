const mongoose = require('mongoose');

const markSchema = new mongoose.Schema({
  subject: { type: String, required: true },
  score: { type: Number, min: 0, max: 100 },
  grade: { type: String },
  term: { type: String },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  addedAt: { type: Date, default: Date.now }
});

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Student name is required'],
    trim: true
  },
  rollNumber: {
    type: String,
    required: [true, 'Roll number is required'],
    unique: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  class: {
    type: String,
    required: [true, 'Class is required']
  },
  section: {
    type: String,
    default: 'A'
  },
  age: {
    type: Number,
    min: [3, 'Age must be at least 3'],
    max: [30, 'Age must be under 30']
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other']
  },
  phone: String,
  address: String,
  parentName: String,
  parentPhone: String,
  marks: [markSchema],
  attendancePercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  profileImage: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'graduated'],
    default: 'active'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Auto-assign grade based on score
markSchema.pre('save', function(next) {
  if (this.score !== undefined) {
    if (this.score >= 90) this.grade = 'A+';
    else if (this.score >= 80) this.grade = 'A';
    else if (this.score >= 70) this.grade = 'B';
    else if (this.score >= 60) this.grade = 'C';
    else if (this.score >= 50) this.grade = 'D';
    else this.grade = 'F';
  }
  next();
});

module.exports = mongoose.model('Student', studentSchema);