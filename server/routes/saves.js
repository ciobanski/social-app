const express = require('express');
const Save = require('../models/Save');
const Post = require('../models/Post');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/posts/:id/save
 * Save (bookmark) a post
 */
router.post('/posts/:id/save', auth, async (req, res) => {
  try {
    const postId = req.params.id;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    await Save.create({ user: req.user._id, post: postId });

    // Notify author of save (optional)
    if (!post.author.equals(req.user._id)) {
      await Notification.create({
        user: post.author,
        type: 'share', // or 'save'
        entity: {
          from: req.user._id,
          post: postId
        }
      });
      const io = req.app.get('io');
      io.to(post.author.toString()).emit('notification', {
        type: 'share',
        from: req.user._id,
        post: postId,
        timestamp: new Date()
      });
    }

    res.status(201).json({ message: 'Post saved' });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Already saved' });
    }
    console.error('Save error:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * DELETE /api/posts/:id/save
 * Unsave (remove bookmark) from a post
 */
router.delete('/posts/:id/save', auth, async (req, res) => {
  try {
    const postId = req.params.id;
    const deleted = await Save.findOneAndDelete({
      user: req.user._id,
      post: postId
    });
    if (!deleted) {
      return res.status(404).json({ message: 'Post not saved yet' });
    }
    res.json({ message: 'Post unsaved' });
  } catch (err) {
    console.error('Unsave error:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/users/me/saves
 * Get all posts saved by the current user
 */
router.get('/users/me/saves', auth, async (req, res) => {
  try {
    const saves = await Save.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate({
        path: 'post',
        populate: { path: 'author', select: 'firstName lastName avatarUrl' }
      });

    res.json(saves.map(s => s.post).filter(p => p));
  } catch (err) {
    console.error('List saves error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
