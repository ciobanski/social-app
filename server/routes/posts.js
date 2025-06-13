// server/routes/posts.js
const express = require('express');
const multer = require('multer');
const { postStorage } = require('../config/cloudinary');
const authMiddleware = require('../middleware/auth');
const Post = require('../models/Post');
const Share = require('../models/Share');
const Like = require('../models/Like');
const Comment = require('../models/Comment');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Hashtag = require('../models/Hashtag');
const { canViewPost } = require('../utils/privacy');

const router = express.Router();

// Multer setup (unchanged)
const upload = multer({
  storage: postStorage,
  limits: { fileSize: 25 * 1024 * 1024 }
}).fields([
  { name: 'images', maxCount: 15 },
  { name: 'videos', maxCount: 15 },
]);

// Create post (unchanged)...
router.post('/', authMiddleware, async (req, res, next) => {
  upload(req, res, async err => {
    if (err) {
      console.error('Multer error:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ message: 'File too large. Maximum is 25 MB.' });
      }
      return res.status(400).json({ message: err.message });
    }
    try {
      const { content, visibility } = req.body;
      let tags = Array.isArray(req.body.hashtags) ? req.body.hashtags : [];
      if (!tags.length && content) {
        tags = (content.match(/#(\w+)/g) || []).map(t => t.slice(1).toLowerCase());
      }
      for (const name of tags) {
        await Hashtag.findOneAndUpdate({ name }, { $inc: { count: 1 } }, { upsert: true });
      }
      const imageUrls = (req.files.images || []).map(f => f.path);
      const videoUrls = (req.files.videos || []).map(f => f.path);

      let post = await Post.create({
        author: req.user._id,
        content,
        imageUrls,
        videoUrls,
        hashtags: tags,
        visibility
      });

      // mentions logic (unchanged)...

      await post.populate('author', 'firstName lastName avatarUrl');
      res.status(201).json({ ...post.toObject(), likeCount: 0, commentCount: 0, liked: false });
    } catch (err) {
      console.error('Create post error:', err);
      next(err);
    }
  });
});

// GET /api/posts?limit=&offset=  — paginated feed
router.get('/', authMiddleware, async (req, res) => {
  try {
    // Parse query params
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const offset = parseInt(req.query.offset) || 0;

    const userId = req.user._id;
    const visibleItems = [];

    // 1) Original posts
    const originals = await Post.find()
      .sort({ createdAt: -1 })
      .populate('author', 'firstName lastName avatarUrl');

    // Filter by privacy
    const visibleOriginals = [];
    for (const post of originals) {
      if (await canViewPost(userId, post)) visibleOriginals.push(post);
    }

    // 2) Shared posts
    const shares = await Share.find()
      .sort({ createdAt: -1 })
      .populate('user', 'firstName lastName avatarUrl')
      .populate({
        path: 'post',
        populate: { path: 'author', select: 'firstName lastName avatarUrl' }
      });

    const visibleShares = [];
    for (const share of shares) {
      if (!share.post) continue;
      if (await canViewPost(userId, share.post)) visibleShares.push(share);
    }

    // Combine & sort
    for (const post of visibleOriginals) {
      visibleItems.push({ type: 'post', post });
    }
    for (const share of visibleShares) {
      visibleItems.push({ type: 'share', share });
    }
    visibleItems.sort((a, b) => {
      const aDate = a.type === 'post' ? a.post.createdAt : a.share.createdAt;
      const bDate = b.type === 'post' ? b.post.createdAt : b.share.createdAt;
      return bDate - aDate;
    });

    // Slice for pagination
    const page = visibleItems.slice(offset, offset + limit);

    // Fetch counts & flags only for this page in parallel
    const results = await Promise.all(page.map(async item => {
      if (item.type === 'post') {
        const p = item.post;
        const [likeCount, commentCount, liked] = await Promise.all([
          Like.countDocuments({ post: p._id }),
          Comment.countDocuments({ post: p._id }),
          Like.exists({ post: p._id, user: userId })
        ]);
        return {
          ...p.toObject(),
          likeCount,
          commentCount,
          liked: Boolean(liked),
          type: 'post',
          saved: false,
          createdAt: p.createdAt
        };
      } else {
        const { share } = item;
        const p = share.post;
        const [likeCount, commentCount, liked] = await Promise.all([
          Like.countDocuments({ post: p._id }),
          Comment.countDocuments({ post: p._id }),
          Like.exists({ post: p._id, user: userId })
        ]);
        return {
          _id: `share-${p._id}-${share.user._id}-${share._id}`,
          type: 'share',
          sharer: share.user,
          original: {
            ...p.toObject(),
            likeCount,
            commentCount,
            liked: Boolean(liked)
          },
          saved: false,
          createdAt: share.createdAt
        };
      }
    }));

    res.json(results);
  } catch (err) {
    console.error('Get feed error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get single post
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'firstName lastName avatarUrl');
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (!(await canViewPost(req.user._id, post))) {
      return res.status(403).json({ message: 'Not authorized' });
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

// Delete a post
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
