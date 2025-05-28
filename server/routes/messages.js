const express = require('express');
const Message = require('../models/Message');
const auth = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/messages/:otherUserId
 * Fetch last 50 messages between req.user and otherUserId, oldest→newest
 */
router.get('/:otherUserId', auth, async (req, res) => {
  const userId = req.user._id; t
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
