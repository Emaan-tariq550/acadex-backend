const express = require('express');
const router = express.Router();
const Class = require('../models/Class');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try {
    const classes = await Class.find().populate('teacherAssigned', 'name email');
    res.json({ success: true, classes });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching classes.' });
  }
});

router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const cls = await Class.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, class: cls });
  } catch (error) {
    res.status(500).json({ message: 'Error creating class.' });
  }
});

router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const cls = await Class.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, class: cls });
  } catch (error) {
    res.status(500).json({ message: 'Error updating class.' });
  }
});

router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    await Class.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Class deleted.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting class.' });
  }
});

module.exports = router;