const express = require('express');
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');
const Notification = require('../models/Notification');

const router = express.Router();

// 1) Send a friend request
// POST /api/friends/request/:userId
router.post('/request/:userId', authMiddleware, async (req, res) => {
  const targetId = req.params.userId;
  const me = req.user._id;

  if (me.equals(targetId)) {
    return res.status(400).json({ message: 'Cannot friend yourself' });
  }

  const target = await User.findById(targetId);
  if (!target) return res.status(404).json({ message: 'User not found' });

  if (target.friends.includes(me)) {
    return res.status(409).json({ message: 'Already friends' });
  }
  if (target.friendRequests.some(r => r.from.equals(me))) {
    return res.status(409).json({ message: 'Request already sent' });
  }

  target.friendRequests.push({ from: me });
  await target.save();

  res.json({ message: 'Friend request sent' });
});

// 2) List incoming friend requests
// GET /api/friends/requests
router.get('/requests', authMiddleware, async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('friendRequests.from', 'firstName lastName avatarUrl');
  res.json({ requests: user.friendRequests });
});

// 3) Accept a friend request
// POST /api/friends/accept/:userId
router.post('/accept/:userId', authMiddleware, async (req, res) => {
  const fromId = req.params.userId;
  const meId = req.user._id;

  const user = await User.findById(meId);
  const idx = user.friendRequests.findIndex(r => r.from.equals(fromId));
  if (idx === -1) {
    return res.status(404).json({ message: 'Friend request not found' });
  }

  // Remove the request and add each other as friends
  user.friendRequests.splice(idx, 1);
  user.friends.push(fromId);
  await user.save();
  await User.findByIdAndUpdate(fromId, { $addToSet: { friends: meId } });

  // Notify the requester that you've accepted
  await Notification.create({
    user: fromId,
    type: 'follow',   // or use 'friend'
    entity: { from: meId }
  });
  const io = req.app.get('io');
  io.to(fromId.toString()).emit('notification', {
    type: 'follow',
    from: meId,
    timestamp: new Date()
  });

  res.json({ message: 'Friend request accepted' });
});

// 4) Reject a friend request
// POST /api/friends/reject/:userId
router.post('/reject/:userId', authMiddleware, async (req, res) => {
  const fromId = req.params.userId;
  const meId = req.user._id;

  const user = await User.findById(meId);
  const idx = user.friendRequests.findIndex(r => r.from.equals(fromId));
  if (idx === -1) {
    return res.status(404).json({ message: 'Friend request not found' });
  }

  user.friendRequests.splice(idx, 1);
  await user.save();
  res.json({ message: 'Friend request rejected' });
});

// 5) List friends
// GET /api/friends
router.get('/', authMiddleware, async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('friends', 'firstName lastName avatarUrl');
  res.json({ friends: user.friends });
});

// 6) Unfriend
// DELETE /api/friends/:userId
router.delete('/:userId', authMiddleware, async (req, res) => {
  const otherId = req.params.userId;
  const meId = req.user._id;

  await User.findByIdAndUpdate(meId, { $pull: { friends: otherId } });
  await User.findByIdAndUpdate(otherId, { $pull: { friends: meId } });

  res.json({ message: 'Unfriended successfully' });
});

module.exports = router;
