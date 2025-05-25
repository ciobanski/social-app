// routes/posts.js

const express = require('express');
const Post = require('../models/Post');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Hashtag = require('../models/Hashtag');
const authMiddleware = require('../middleware/auth');
const { canViewPost } = require('../utils/privacy');
const router = express.Router();

// ── Create a new post ───────────────────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { content, imageUrl, hashtags, visibility } = req.body;

    // Derive tags from content if none provided
    let tags = Array.isArray(hashtags) ? hashtags : [];
    if ((!tags || tags.length === 0) && content) {
      tags = (content.match(/#(\w+)/g) || [])
        .map(tag => tag.slice(1).toLowerCase());
    }

    // Upsert hashtags collection (optional)
    for (let tagName of tags) {
      await Hashtag.findOneAndUpdate(
        { name: tagName },
        { $inc: { count: 1 } },
        { upsert: true }
      );
    }

    // 1) Create the post, including visibility
    const post = await Post.create({
      author: req.user._id,
      content,
      imageUrl,
      hashtags: tags,
      visibility       // 'public' | 'friends' | 'private'
    });

    // 2) Parse @mentions and notify
    const mentions = (content.match(/@([A-Za-z0-9_]+)/g) || [])
      .map(m => m.slice(1).toLowerCase());

    for (let uname of mentions) {
      // Assuming username is local-part of email
      const mentionedUser = await User.findOne({ email: new RegExp(`^${uname}@`, 'i') });
      if (!mentionedUser) continue;

      // Persist notification
      await Notification.create({
        user: mentionedUser._id,
        type: 'mention',
        entity: {
          from: req.user._id,
          post: post._id
        }
      });

      // Emit real-time event
      const io = req.app.get('io');
      io.to(mentionedUser._id.toString()).emit('notification', {
        type: 'mention',
        from: req.user._id,
        post: post._id,
        timestamp: new Date()
      });
    }

    res.status(201).json(post);
  } catch (err) {
    console.error('Create post error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── Get feed ────────────────────────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  try {
    const allPosts = await Post.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('author', 'firstName lastName avatarUrl');

    const visible = [];
    for (let post of allPosts) {
      if (await canViewPost(req.user._id, post)) {
        visible.push(post);
      }
    }

    res.json(visible);
  } catch (err) {
    console.error('Get feed error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── Get a single post ──────────────────────────────────────────────
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'firstName lastName avatarUrl');
    if (!post) return res.status(404).json({ message: 'Post not found' });

    if (!await canViewPost(req.user._id, post)) {
      return res.status(403).json({ message: 'Not authorized to view this post' });
    }

    res.json(post);
  } catch (err) {
    console.error('Get post error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── Delete a post ─────────────────────────────────────────────────
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    // Only the author or admin may delete
    if (!post.author.equals(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await post.deleteOne();
    res.json({ message: 'Post deleted' });
  } catch (err) {
    console.error('Delete post error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
