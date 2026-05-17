const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// @route  GET /api/users
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { role, search } = req.query;
    const query = {};
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    const users = await User.find(query).sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users.' });
  }
});

// @route  PUT /api/users/:id/status
router.put('/:id/status', protect, authorize('admin'), async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);
    
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Admin cannot deactivate another admin unless super admin
    if (targetUser.role === 'admin' && !req.user.isSuperAdmin) {
      return res.status(403).json({ 
        message: 'Only Super Admin can manage other admin accounts.' 
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: req.body.isActive },
      { new: true }
    );
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ message: 'Error updating user status.' });
  }
});

// @route  DELETE /api/users/:id
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    // Cannot delete yourself
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot delete your own account.' });
    }

    const targetUser = await User.findById(req.params.id);
    
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Admin cannot delete another admin unless super admin
    if (targetUser.role === 'admin' && !req.user.isSuperAdmin) {
      return res.status(403).json({ 
        message: 'Only Super Admin can delete admin accounts.' 
      });
    }

    // Super admin cannot be deleted
    if (targetUser.isSuperAdmin) {
      return res.status(403).json({ 
        message: 'Super Admin account cannot be deleted.' 
      });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user.' });
  }
});

// @route  GET /api/users/registered-students
// @desc   Get all registered student accounts (for teacher to add to class)
router.get('/registered-students', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { search } = req.query;
    const query = { role: 'student', isActive: true };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const students = await User.find(query).select('name email createdAt');
    res.json({ success: true, students });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching registered students.' });
  }
});

module.exports = router;