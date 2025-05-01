const express = require('express');
const Post = require('../models/Post');
const auth = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/hashtags/trending
 * Returns top-10 hashtags in the past 24 hours with their counts.
 */
router.get('/trending', auth, async (req, res) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const pipeline = [
      { $match: { createdAt: { $gte: since } } },
      { $unwind: '$hashtags' },
      { $group: { _id: '$hashtags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { tag: '$_id', count: 1, _id: 0 } }
    ];
    const trending = await Post.aggregate(pipeline);
    res.json(trending);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/hashtags/search?tag=<tag>
 * Returns all posts containing the given tag.
 */
router.get('/search', auth, async (req, res) => {
  try {
    const { tag } = req.query;
    if (!tag) {
      return res.status(400).json({ message: 'Query param `tag` is required' });
    }
    const posts = await Post.find({ hashtags: tag.toLowerCase() })
      .sort({ createdAt: -1 })
      .populate('author', 'name avatarUrl');
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
