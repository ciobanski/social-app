const express = require('express');
const authMiddleware = require('../middleware/auth');
const Share = require('../models/Share');
const Post = require('../models/Post');
const Notification = require('../models/Notification');

const router = express.Router();

// POST /api/shares/:postId  — share a post
router.post('/:postId', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const postId = req.params.postId;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    await Share.create({ user: userId, post: postId });

    // Notify author of share
    if (!post.author.equals(userId)) {
      await Notification.create({
        user: post.author,
        type: 'share',
        entity: {
          from: userId,
          post: postId
        }
      });
      const io = req.app.get('io');
      io.to(post.author.toString()).emit('notification', {
        type: 'share',
        from: userId,
        post: postId,
        timestamp: new Date()
      });
    }

    res.json({ message: 'Post shared' });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Already shared' });
    }
    console.error('Share error:', err);
    res.status(500).json({ message: 'Server error while sharing post' });
  }
});

// DELETE /api/shares/:postId  — unshare a post
router.delete('/:postId', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const postId = req.params.postId;

    const result = await Share.deleteOne({ user: userId, post: postId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Share not found' });
    }
    res.json({ message: 'Post unshared' });
  } catch (err) {
    console.error('Unshare error:', err);
    res.status(500).json({ message: 'Server error while unsharing post' });
  }
});

// GET /api/shares/:postId  — get share count & users
router.get('/:postId', async (req, res) => {
  try {
    const postId = req.params.postId;
    const shares = await Share.find({ post: postId })
      .populate('user', 'firstName lastName avatarUrl');
    res.json({
      count: shares.length,
      users: shares.map(s => s.user)
    });
  } catch (err) {
    console.error('Get shares error:', err);
    res.status(500).json({ message: 'Server error while fetching shares' });
  }
});

module.exports = router;
