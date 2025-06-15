const express = require('express');
const Message = require('../models/Message');
const auth = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/messages/unread-counts
 */
router.get('/unread-counts', auth, async (req, res) => {
  try {
    const agg = await Message.aggregate([
      { $match: { to: req.user._id, read: false } },
      { $group: { _id: '$from', count: { $sum: 1 } } }
    ]);
    const counts = {};
    agg.forEach(({ _id, count }) => {
      counts[_id.toString()] = count;
    });
    res.json(counts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/messages/:otherUserId
 * Fetch last 50 messages, then mark the ones *from* them as read.
 */
router.get('/:otherUserId', auth, async (req, res) => {
  try {
    const me = req.user._id.toString();
    const other = req.params.otherUserId;

    // 1) Fetch
    const messages = await Message.find({
      $or: [
        { from: me, to: other },
        { from: other, to: me }
      ]
    })
      .sort({ createdAt: 1 })
      .limit(50)
      .populate('from', 'firstName lastName avatarUrl')
      .lean();

    // 2) Mark their unread → read
    await Message.updateMany(
      { from: other, to: me, read: false },
      { $set: { read: true } }
    );

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
