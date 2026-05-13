const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Class = require('../models/Class');
const { protect, authorize } = require('../middleware/auth');

// @route  GET /api/dashboard/stats
// @access Admin
router.get('/stats', protect, authorize('admin'), async (req, res) => {
  try {
    const [
      totalStudents,
      totalTeachers,
      totalClasses,
      activeStudents,
      recentStudents
    ] = await Promise.all([
      Student.countDocuments(),
      User.countDocuments({ role: 'teacher' }),
      Class.countDocuments(),
      Student.countDocuments({ status: 'active' }),
      Student.find().sort({ createdAt: -1 }).limit(5).populate('createdBy', 'name')
    ]);

    // Attendance stats (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const attendanceStats = await Attendance.aggregate([
      { $match: { date: { $gte: thirtyDaysAgo } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Class distribution
    const classDistribution = await Student.aggregate([
      { $group: { _id: '$class', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Monthly enrollment (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyEnrollment = await Student.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { 
            year: { $year: '$createdAt' }, 
            month: { $month: '$createdAt' } 
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({
      success: true,
      stats: {
        totalStudents,
        totalTeachers,
        totalClasses,
        activeStudents,
        recentStudents,
        attendanceStats,
        classDistribution,
        monthlyEnrollment
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching dashboard stats.' });
  }
});

// @route  GET /api/dashboard/teacher-stats
// @access Teacher
router.get('/teacher-stats', protect, authorize('teacher'), async (req, res) => {
  try {
    const myStudents = await Student.find({ createdBy: req.user._id });
    const studentIds = myStudents.map(s => s._id);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAttendance = await Attendance.find({
      student: { $in: studentIds },
      date: { $gte: today, $lt: tomorrow }
    });

    const avgAttendance = myStudents.length > 0
      ? Math.round(myStudents.reduce((sum, s) => sum + s.attendancePercentage, 0) / myStudents.length)
      : 0;

    res.json({
      success: true,
      stats: {
        myStudentsCount: myStudents.length,
        todayPresent: todayAttendance.filter(a => a.status === 'present').length,
        todayAbsent: todayAttendance.filter(a => a.status === 'absent').length,
        avgAttendance,
        recentStudents: myStudents.slice(0, 5)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching teacher stats.' });
  }
});

module.exports = router;