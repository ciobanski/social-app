// routes/presence.js

const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();
router.use(auth);

/**
 * GET /api/presence
 * Returns your friends’ presence statuses and lastSeen timestamps.
 */
router.get('/', async (req, res) => {
  try {
    const onlineUsers = req.app.get('onlineUsers');
    const me = await User.findById(req.user._id, 'friends').lean();

    const friends = await User.find(
      { _id: { $in: me.friends } },
      'firstName lastName avatarUrl lastSeen'
    )
      .lean();

    const result = friends.map(f => ({
      id: f._id,
      firstName: f.firstName,
      lastName: f.lastName,
      avatarUrl: f.avatarUrl,
      isOnline: onlineUsers.has(f._id.toString()),
      lastSeen: f.lastSeen
    }));

    res.json({ friends: result });
  } catch (err) {
    console.error('GET /api/presence error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
