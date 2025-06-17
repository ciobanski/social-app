// server/routes/friends.js
const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Notification = require('../models/Notification');

const router = express.Router();



// ─── Friends-only feed (with shares!) ───────────────────────
router.get('/friends', auth, async (req, res) => {
  try {
    // 1) get your friend IDs
    const me = await User.findById(req.user._id).select('friends').lean();
    const friendIds = me.friends.map(id => id.toString());
    friendIds.push(req.user._id.toString());

    // 2) fetch originals & shares in parallel
    const [originals, shares] = await Promise.all([
      Post.find({ author: { $in: friendIds } })
        .sort({ createdAt: -1 })
        .populate('author', 'firstName lastName avatarUrl')
        .lean(),
      Share.find({ user: { $in: friendIds } })
        .sort({ createdAt: -1 })
        .populate('user', 'firstName lastName avatarUrl')
        .populate({
          path: 'post',
          populate: { path: 'author', select: 'firstName lastName avatarUrl' }
        })
        .lean()
    ]);

    // 3) combine & sort by date
    const feed = [
      ...originals.map(p => ({ type: 'post', post: p })),
      ...shares.map(s => ({ type: 'share', share: s }))
    ].sort((a, b) => {
      const aDate = a.type === 'post' ? a.post.createdAt : a.share.createdAt;
      const bDate = b.type === 'post' ? b.post.createdAt : b.share.createdAt;
      return bDate - aDate;
    });

    // 4) paginate (offset/limit)
    const offset = parseInt(req.query.offset) || 0;
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const page = feed.slice(offset, offset + limit);

    // 5) annotate counts & flags just like /api/posts does…
    const results = await Promise.all(page.map(async item => {
      if (item.type === 'post') {
        const p = item.post;
        const [likeCount, commentCount, liked] = await Promise.all([
          Like.countDocuments({ post: p._id }),
          Comment.countDocuments({ post: p._id }),
          Like.exists({ post: p._id, user: req.user._id })
        ]);
        return {
          ...p,
          type: 'post',
          likeCount,
          commentCount,
          liked: Boolean(liked),
          saved: false,
          createdAt: p.createdAt
        };
      } else {
        const { share } = item;
        const p = share.post;
        const [likeCount, commentCount, liked] = await Promise.all([
          Like.countDocuments({ post: p._id }),
          Comment.countDocuments({ post: p._id }),
          Like.exists({ post: p._id, user: req.user._id })
        ]);
        return {
          _id: `share-${p._id}-${share.user._id}-${share._id}`,
          type: 'share',
          sharer: share.user,
          original: {
            ...p,
            likeCount,
            commentCount,
            liked: Boolean(liked)
          },
          saved: false,
          createdAt: share.createdAt
        };
      }
    }));

    return res.json(results);
  } catch (err) {
    console.error('GET /api/posts/friends error:', err);
    return res.status(500).json({ message: 'Could not load friends feed' });
  }
});

// 1) Send a friend request
// POST /api/friends/request/:userId
router.post('/request/:userId', auth, async (req, res) => {
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

  // optional: notification
  await Notification.create({
    user: targetId,
    type: 'friend_request',
    entity: { from: me }
  });

  res.json({ message: 'Friend request sent' });
});

// 2) List incoming friend requests
// GET /api/friends/requests
router.get('/requests', auth, async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('friendRequests.from', 'firstName lastName avatarUrl');
  res.json({ requests: user.friendRequests });
});

// 3) Accept a friend request
// POST /api/friends/accept/:userId
router.post('/accept/:userId', auth, async (req, res) => {
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

  // send back a “friend_accept” notification
  const note = await Notification.create({
    user: fromId,
    type: 'friend_accept',
    entity: { from: meId }
  });
  // real‐time emit if you want
  const io = req.app.get('io');
  io?.to(fromId.toString()).emit('notification', note);

  res.json({ message: 'Friend request accepted' });
});

// 4) Reject a friend request
// POST /api/friends/reject/:userId
router.post('/reject/:userId', auth, async (req, res) => {
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
router.get('/', auth, async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('friends', 'firstName lastName avatarUrl');
  res.json({ friends: user.friends });
});

// 6) Unfriend
// DELETE /api/friends/:userId
router.delete('/:userId', auth, async (req, res) => {
  const otherId = req.params.userId;
  const meId = req.user._id;

  await User.findByIdAndUpdate(meId, { $pull: { friends: otherId } });
  await User.findByIdAndUpdate(otherId, { $pull: { friends: meId } });
  res.json({ message: 'Unfriended successfully' });
});

module.exports = router;
