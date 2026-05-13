const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const { protect, authorize } = require('../middleware/auth');

// @route  POST /api/attendance
// @access Admin, Teacher
router.post('/', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { studentId, date, status, class: cls, subject, remarks } = req.body;

    const record = await Attendance.create({
      student: studentId,
      date: new Date(date),
      status,
      class: cls,
      subject,
      remarks,
      markedBy: req.user._id
    });

    // Update student attendance percentage
    const totalDays = await Attendance.countDocuments({ student: studentId });
    const presentDays = await Attendance.countDocuments({ 
      student: studentId, 
      status: { $in: ['present', 'late'] }
    });
    const percentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
    
    await Student.findByIdAndUpdate(studentId, { attendancePercentage: percentage });

    res.status(201).json({ success: true, record });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Attendance already marked for this date.' });
    }
    res.status(500).json({ message: 'Error marking attendance.' });
  }
});

// @route  POST /api/attendance/bulk
// @desc   Mark attendance for multiple students at once
// @access Admin, Teacher
router.post('/bulk', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { records, date, class: cls, subject } = req.body;
    
    const attendanceRecords = records.map(r => ({
      student: r.studentId,
      date: new Date(date),
      status: r.status,
      class: cls,
      subject,
      markedBy: req.user._id
    }));

    const saved = await Attendance.insertMany(attendanceRecords, { ordered: false });

    // Update attendance percentages for all students
    for (const record of records) {
      const totalDays = await Attendance.countDocuments({ student: record.studentId });
      const presentDays = await Attendance.countDocuments({ 
        student: record.studentId, 
        status: { $in: ['present', 'late'] }
      });
      const percentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
      await Student.findByIdAndUpdate(record.studentId, { attendancePercentage: percentage });
    }

    res.status(201).json({ success: true, saved: saved.length });
  } catch (error) {
    res.status(500).json({ message: 'Error marking bulk attendance.' });
  }
});

// @route  GET /api/attendance/:studentId
// @access Admin, Teacher, Student (own)
router.get('/:studentId', protect, async (req, res) => {
  try {
    const { month, year } = req.query;
    const query = { student: req.params.studentId };

    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      query.date = { $gte: start, $lte: end };
    }

    const records = await Attendance.find(query)
      .populate('markedBy', 'name')
      .sort({ date: -1 });

    const stats = {
      total: records.length,
      present: records.filter(r => r.status === 'present').length,
      absent: records.filter(r => r.status === 'absent').length,
      late: records.filter(r => r.status === 'late').length,
      excused: records.filter(r => r.status === 'excused').length,
    };
    stats.percentage = stats.total > 0 
      ? Math.round(((stats.present + stats.late) / stats.total) * 100) 
      : 0;

    res.json({ success: true, records, stats });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching attendance.' });
  }
});

module.exports = router;