const express = require('express');
const multer = require('multer');
const { postStorage } = require('../config/cloudinary');
const authMiddleware = require('../middleware/auth');
const Post = require('../models/Post');
const Like = require('../models/Like');
const Comment = require('../models/Comment');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Hashtag = require('../models/Hashtag');
const { canViewPost } = require('../utils/privacy');

const router = express.Router();

// accept up to 15 images under field name 'images'
const upload = multer({ storage: postStorage }).array('images', 15);

// ── Create a new post (with 0–15 images) ───────────────────────
router.post('/', authMiddleware, async (req, res, next) => {
  // wrap multer in a promise so we can await it inside our async handler
  upload(req, res, async err => {
    if (err) {
      // MulterError or other upload error
      console.error('Multer error:', err);
      return res.status(400).json({ message: err.message });
    }
    try {
      const { content, visibility } = req.body;

      // build hashtags array
      let tags = Array.isArray(req.body.hashtags)
        ? req.body.hashtags
        : [];
      if (!tags.length && content) {
        tags = (content.match(/#(\w+)/g) || [])
          .map(t => t.slice(1).toLowerCase());
      }
      for (let name of tags) {
        await Hashtag.findOneAndUpdate(
          { name },
          { $inc: { count: 1 } },
          { upsert: true }
        );
      }

      // collect all uploaded image URLs (Cloudinary paths)
      const imageUrls = (req.files || []).map(f => f.path);

      // create the post
      let post = await Post.create({
        author: req.user._id,
        content,
        imageUrls,
        hashtags: tags,
        visibility
      });

      // handle @mentions
      const mentions = (content.match(/@([A-Za-z0-9_]+)/g) || [])
        .map(m => m.slice(1).toLowerCase());
      for (let uname of mentions) {
        const mentionedUser = await User.findOne({
          email: new RegExp(`^${uname}@`, 'i')
        });
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

      // populate author, inject meta, and respond
      await post.populate('author', 'firstName lastName avatarUrl');
      res.status(201).json({
        ...post.toObject(),
        likeCount: 0,
        commentCount: 0,
        liked: false
      });
    } catch (err) {
      console.error('Create post error:', err);
      next(err);
    }
  });
});

// ── Get feed (with counts & liked flag) ────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  try {
    const allPosts = await Post.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('author', 'firstName lastName avatarUrl');

    const visible = [];
    for (let post of allPosts) {
      if (!(await canViewPost(req.user._id, post))) continue;

      const [likeCount, commentCount, liked] = await Promise.all([
        Like.countDocuments({ post: post._id }),
        Comment.countDocuments({ post: post._id }),
        Like.exists({ post: post._id, user: req.user._id })
      ]);

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

// ── Get single post ────────────────────────────────────────────
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

// ── Delete a post ─────────────────────────────────────────────
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
