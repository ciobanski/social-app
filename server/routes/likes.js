const express = require('express');
const Like = require('../models/Like');
const Post = require('../models/Post');
const auth = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/posts/:id/like
 * Like a post
 */
router.post('/posts/:id/like', auth, async (req, res) => {
  try {
    const postId = req.params.id;
    // Optional: verify post exists
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const like = await Like.create({ user: req.user._id, post: postId });
    res.status(201).json({ message: 'Post liked' });
  } catch (err) {
    if (err.code === 11000) {
      // duplicate key
      return res.status(400).json({ message: 'Already liked' });
    }
    res.status(500).json({ message: err.message });
  }
});

/**
 * DELETE /api/posts/:id/like
 * Unlike a post
 */
router.delete('/posts/:id/like', auth, async (req, res) => {
  try {
    const postId = req.params.id;
    const deleted = await Like.findOneAndDelete({
      user: req.user._id,
      post: postId
    });
    if (!deleted) {
      return res.status(404).json({ message: 'Post not liked yet' });
    }
    res.json({ message: 'Post unliked' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/posts/:id/likes
 * Get number of likes on a post
 */
router.get('/posts/:id/likes', async (req, res) => {
  try {
    const postId = req.params.id;
    const count = await Like.countDocuments({ post: postId });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
