const express = require('express');
const Report = require('../models/Report');
const auth = require('../middleware/auth');

const router = express.Router();

// ── POST /api/reports
// Create a new report on a User, Post, or Comment
router.post('/', auth, async (req, res) => {
  try {
    const { targetType, targetId, reason } = req.body;
    if (!['User', 'Post', 'Comment'].includes(targetType)) {
      return res.status(400).json({ message: 'Invalid targetType' });
    }
    if (!targetId || !reason) {
      return res.status(400).json({ message: 'targetId and reason are required' });
    }
    const report = await Report.create({
      reporter: req.user._id,
      targetType,
      targetId,
      reason
    });
    res.status(201).json(report);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
