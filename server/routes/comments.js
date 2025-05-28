const express = require('express');
const Comment = require('../models/Comment');
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');
const Notification = require('../models/Notification');
const router = express.Router();

// ── Create a comment or reply ───────────────────────────────────────────────
// ── Create a comment with mention notifications ─────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { postId, content, parentComment } = req.body;

    // 1) Create the comment
    const comment = await Comment.create({
      author: req.user._id,
      post: postId,
      content,
      parentComment: parentComment || null
    });

    // 2) Parse @mentions and notify
    const mentions = (content.match(/@([A-Za-z0-9_]+)/g) || [])
      .map(m => m.slice(1).toLowerCase());

    for (let uname of mentions) {
      const mentionedUser = await User.findOne({ email: new RegExp(`^${uname}@`, 'i') });
      if (!mentionedUser) continue;

      await Notification.create({
        user: mentionedUser._id,
        type: 'mention',
        entity: {
          from: req.user._id,
          post: postId,
          comment: comment._id
        }
      });

      const io = req.app.get('io');
      io.to(mentionedUser._id.toString()).emit('notification', {
        type: 'mention',
        from: req.user._id,
        post: postId,
        comment: comment._id,
        timestamp: new Date()
      });
    }
    await comment.populate('author', 'firstName lastName avatarUrl');
    res.status(201).json(comment);
  } catch (err) {
    console.error('Create comment error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── Get all comments for a post ────────────────────────────────────────────
// GET /api/comments/post/:postId
router.get('/post/:postId', authMiddleware, async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.postId })
      .sort({ createdAt: 1 })               // oldest first
      .populate('author', 'firstName lastName avatarUrl')
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
