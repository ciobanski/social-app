const express = require('express');
const Post = require('../models/Post');

const router = express.Router();

// GET /api/trending
// Returns top 10 hashtags (from post.hashtags) and top 10 recent posts
router.get('/', async (req, res) => {
  try {
    // 1) Aggregate top tags directly from posts
    const tagAgg = await Post.aggregate([
      { $unwind: '$hashtags' },
      { $group: { _id: '$hashtags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    const topTags = tagAgg.map(t => ({ tag: t._id, count: t.count }));

    // 2) Get popular posts (or just recent, since likesCount isn’t set up yet)
    const popularPosts = await Post.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('author', 'firstName lastName avatarUrl')
      .select('content author createdAt');

    res.json({
      hashtags: topTags,
      posts: popularPosts
    });
  } catch (err) {
    console.error('Trending error:', err);
    res.status(500).json({ message: 'Server error fetching trending data' });
  }
});

module.exports = router;
