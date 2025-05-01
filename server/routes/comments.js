const express = require('express');
const Comment = require('../models/Comment');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ── Create a comment or reply ───────────────────────────────────────────────
// POST /api/comments
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { post, content, parentComment } = req.body;
    if (!post || !content) {
      return res.status(400).json({ message: 'Post ID and content are required' });
    }
    const comment = await Comment.create({
      post,
      author: req.user._id,
      parentComment: parentComment || null,
      content
    });
    // populate author for the response
    await comment.populate('author', 'name avatarUrl');
    res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Get all comments for a post ────────────────────────────────────────────
// GET /api/comments/post/:postId
router.get('/post/:postId', authMiddleware, async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.postId })
      .sort({ createdAt: 1 })               // oldest first
      .populate('author', 'name avatarUrl');
    res.json(comments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/comments/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    // Authorization check
    if (!comment.author.equals(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Count any direct replies before deleting
    const childCount = await Comment.countDocuments({ parentComment: id });

    // Delete the comment itself
    await comment.deleteOne();

    // If it had replies, cascade-delete them
    if (childCount > 0) {
      await Comment.deleteMany({ parentComment: id });
    }

    // Craft a context-aware message
    let message;
    if (comment.parentComment) {
      // This was a reply
      if (childCount > 0) {
        message = 'Reply and its nested replies deleted';
      } else {
        message = 'Reply deleted';
      }
    } else {
      // This was a top-level comment
      if (childCount > 0) {
        message = 'Comment and its replies deleted';
      } else {
        message = 'Comment deleted';
      }
    }

    return res.json({ message });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});


module.exports = router;
