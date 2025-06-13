const express = require('express');
const Message = require('../models/Message');
const auth = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/messages/:otherUserId
 * Fetch last 50 messages between req.user and otherUserId, oldest→newest
 */

// GET /api/messages/unread-counts
// routes/messages.js
router.get('/unread-counts', auth, async (req, res) => {
  // Example: count unread messages **to** me, grouped by sender
  const counts = await Message.aggregate([
    { $match: { to: req.user._id, read: false } },
    { $group: { _id: '$from', count: { $sum: 1 } } }
  ]);
  res.json({ counts });
});
router.get('/:otherUserId', auth, async (req, res) => {
  const userId = req.user._id;
  const other = req.params.otherUserId;
  const messages = await Message.find({
    $or: [
      { from: userId, to: other },
      { from: other, to: userId }
    ]
  })
    .sort({ createdAt: 1 })
    .limit(50)
    .populate('from', 'name avatarUrl');
  res.json(messages);
});

module.exports = router;
