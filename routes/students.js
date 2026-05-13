const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const { protect, authorize } = require('../middleware/auth');

// @route  GET /api/students
// @access Admin, Teacher
router.get('/', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', class: className, status } = req.query;
    
    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (className) query.class = className;
    if (status) query.status = status;

    // Teachers only see students they created
    if (req.user.role === 'teacher') {
      query.createdBy = req.user._id;
    }

    const total = await Student.countDocuments(query);
    const students = await Student.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      success: true,
      students,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching students.' });
  }
});

// @route  GET /api/students/me
// @access Student (own data)
router.get('/me', protect, authorize('student'), async (req, res) => {
  try {
    const student = await Student.findOne({ email: req.user.email });
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found.' });
    }
    res.json({ success: true, student });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching your profile.' });
  }
});

// @route  GET /api/students/:id
// @access Admin, Teacher
router.get('/:id', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).populate('createdBy', 'name email');
    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }
    res.json({ success: true, student });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching student.' });
  }
});

// @route  POST /api/students
// @access Admin, Teacher
router.post('/', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const student = await Student.create({
      ...req.body,
      createdBy: req.user._id
    });
    res.status(201).json({ success: true, student });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Roll number already exists.' });
    }
    res.status(500).json({ message: 'Error creating student.', error: error.message });
  }
});

// @route  PUT /api/students/:id
// @access Admin, Teacher
router.put('/:id', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }
    res.json({ success: true, student });
  } catch (error) {
    res.status(500).json({ message: 'Error updating student.' });
  }
});

// @route  DELETE /api/students/:id
// @access Admin only
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }
    res.json({ success: true, message: 'Student deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting student.' });
  }
});

// @route  POST /api/students/:id/marks
// @access Admin, Teacher
router.post('/:id/marks', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    const { subject, score, term } = req.body;
    
    // Calculate grade
    let grade;
    if (score >= 90) grade = 'A+';
    else if (score >= 80) grade = 'A';
    else if (score >= 70) grade = 'B';
    else if (score >= 60) grade = 'C';
    else if (score >= 50) grade = 'D';
    else grade = 'F';

    student.marks.push({ subject, score, grade, term, addedBy: req.user._id });
    await student.save();

    res.status(201).json({ success: true, student });
  } catch (error) {
    res.status(500).json({ message: 'Error adding marks.' });
  }
});

module.exports = router;