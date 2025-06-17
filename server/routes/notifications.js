// server/routes/notifications.js

const express = require('express');
const auth = require('../middleware/auth');
const Notification = require('../models/Notification');

const router = express.Router();

/**
 * GET /api/notifications
 * — Returns { notifications: [ ... ] }
 * — Most-recent first, with entity.from populated to full user info.
 */
router.get('/', auth, async (req, res) => {
  try {
    const notes = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      // bring in the “from” user’s name/avatar
      .populate('entity.from', 'firstName lastName avatarUrl')
      // if you ever need the post or comment metadata on the client:
      // .populate('entity.post', '_id')
      // .populate('entity.comment', '_id content')
      .lean();

    res.json({ notifications: notes });
  } catch (err) {
    console.error('GET /api/notifications error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * PATCH /api/notifications/mark-all-read
 * — Marks all of the current user’s notifications as read.
 */
router.patch('/mark-all-read', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, read: false },
      { $set: { read: true } }
    );
    res.json({ message: 'All notifications marked read' });
  } catch (err) {
    console.error('PATCH /api/notifications/mark-all-read error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
