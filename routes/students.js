const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const User = require('../models/User');
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
      .populate('linkedUserId', 'name email')
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
// @access Student (own data only)
router.get('/me', protect, authorize('student'), async (req, res) => {
  try {
    const student = await Student.findOne({ 
      $or: [
        { email: req.user.email },
        { linkedUserId: req.user._id }
      ]
    });
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found. Contact your teacher.' });
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
    const student = await Student.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('linkedUserId', 'name email');
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
    const { linkedUserId, ...studentData } = req.body;

    // Agar registered user se link kar rahe hain
    if (linkedUserId) {
      // Check karo already profile toh nahi bani
      const existing = await Student.findOne({ linkedUserId });
      if (existing) {
        return res.status(400).json({ 
          message: 'This student already has a profile. You can find them in the students list.' 
        });
      }

      // Registered user ki info lo
      const registeredUser = await User.findById(linkedUserId);
      if (!registeredUser || registeredUser.role !== 'student') {
        return res.status(400).json({ message: 'Invalid student account selected.' });
      }

      // Email aur naam registered user se lo
      studentData.email = registeredUser.email;
      if (!studentData.name || studentData.name.trim() === '') {
        studentData.name = registeredUser.name;
      }
    }

    const student = await Student.create({
      ...studentData,
      linkedUserId: linkedUserId || null,
      createdBy: req.user._id
    });

    res.status(201).json({ success: true, student });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Roll number already exists. Please use a unique roll number.' });
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

    if (score < 0 || score > 100) {
      return res.status(400).json({ message: 'Score must be between 0 and 100.' });
    }

    // Grade calculate karo
    let grade;
    if (score >= 90) grade = 'A+';
    else if (score >= 80) grade = 'A';
    else if (score >= 70) grade = 'B';
    else if (score >= 60) grade = 'C';
    else if (score >= 50) grade = 'D';
    else grade = 'F';

    student.marks.push({ 
      subject, 
      score, 
      grade, 
      term, 
      addedBy: req.user._id 
    });
    
    await student.save();

    res.status(201).json({ success: true, student });
  } catch (error) {
    res.status(500).json({ message: 'Error adding marks.' });
  }
});

module.exports = router;