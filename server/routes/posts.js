// routes/posts.js
const express = require('express');
const Post = require('../models/Post');
const Like = require('../models/Like');           // ← add this
const Comment = require('../models/Comment');     // ← and this
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

    let tags = Array.isArray(hashtags) ? hashtags : [];
    if ((!tags || tags.length === 0) && content) {
      tags = (content.match(/#(\w+)/g) || []).map(t => t.slice(1).toLowerCase());
    }
    for (let tagName of tags) {
      await Hashtag.findOneAndUpdate(
        { name: tagName },
        { $inc: { count: 1 } },
        { upsert: true }
      );
    }

    // Create the post
    let post = await Post.create({
      author: req.user._id,
      content,
      imageUrl,
      hashtags: tags,
      visibility
    });

    // Mentions (unchanged)
    const mentions = (content.match(/@([A-Za-z0-9_]+)/g) || []).map(m => m.slice(1).toLowerCase());
    for (let uname of mentions) {
      const mentionedUser = await User.findOne({ email: new RegExp(`^${uname}@`, 'i') });
      if (!mentionedUser) continue;
      await Notification.create({
        user: mentionedUser._id,
        type: 'mention',
        entity: { from: req.user._id, post: post._id }
      });
      const io = req.app.get('io');
      io.to(mentionedUser._id.toString()).emit('notification', {
        type: 'mention',
        from: req.user._id,
        post: post._id,
        timestamp: new Date()
      });
    }

    // Populate author and send enriched post
    await post.populate('author', 'firstName lastName avatarUrl');
    res.status(201).json({
      ...post.toObject(),
      likeCount: 0,
      commentCount: 0,
      liked: false
    });
  } catch (err) {
    console.error('Create post error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── Get feed ────────────────────────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  try {
    // 1) fetch latest 20 posts as Mongoose docs
    const allPosts = await Post.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('author', 'firstName lastName avatarUrl');

    const visible = [];
    for (let post of allPosts) {
      // 2) privacy check
      if (!(await canViewPost(req.user._id, post))) continue;

      // 3) like & comment counts + whether current user liked
      const [likeCount, commentCount, liked] = await Promise.all([
        Like.countDocuments({ post: post._id }),
        Comment.countDocuments({ post: post._id }),
        Like.exists({ post: post._id, user: req.user._id })
      ]);

      // 4) toObject + inject fields
      visible.push({
        ...post.toObject(),
        likeCount,
        commentCount,
        liked: Boolean(liked)
      });
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
    if (!(await canViewPost(req.user._id, post))) {
      return res.status(403).json({ message: 'Not authorized to view this post' });
    }
    const [likeCount, commentCount, liked] = await Promise.all([
      Like.countDocuments({ post: post._id }),
      Comment.countDocuments({ post: post._id }),
      Like.exists({ post: post._id, user: req.user._id })
    ]);
    res.json({
      ...post.toObject(),
      likeCount,
      commentCount,
      liked: Boolean(liked)
    });
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
