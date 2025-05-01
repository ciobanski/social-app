const express = require('express');
const Post = require('../models/Post');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ── Create a new post ───────────────────────────────────────────────
// POST /api/posts
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { content, imageUrl, hashtags } = req.body;

    // Derive tags from content if not provided
    let tags = Array.isArray(hashtags) ? hashtags : [];
    if ((!tags || tags.length === 0) && content) {
      tags = (content.match(/#(\w+)/g) || []).map(tag =>
        tag.slice(1).toLowerCase()
      );
    }

    const post = await Post.create({
      author: req.user._id,
      content,
      imageUrl,
      hashtags: tags
    });

    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// ── Get all posts (feed) ───────────────────────────────────────────
// GET /api/posts
router.get('/', authMiddleware, async (req, res) => {
  try {
    // Simple feed: newest first, limit to 20
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('author', 'name avatarUrl');
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Get a single post ──────────────────────────────────────────────
// GET /api/posts/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('author', 'name avatarUrl');
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Delete a post ───────────────────────────────────────────────────────
// DELETE /api/posts/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    // Only allow the author or an admin to delete
    if (!post.author.equals(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    // Instead of post.remove(), use:
    await post.deleteOne();
    // —OR— you could do:
    // await Post.findByIdAndDelete(req.params.id);

    res.json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
module.exports = router;
