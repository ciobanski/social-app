// routes/search.js

const express = require('express');
const User = require('../models/User');
const Post = require('../models/Post');
const Hashtag = require('../models/Hashtag');
const authMiddleware = require('../middleware/auth');
const { canViewPost } = require('../utils/privacy');

const router = express.Router();

// ── Full-text search with pagination, visibility & highlights ────────────
router.get('/', authMiddleware, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json({ users: [], posts: [], hashtags: [] });

    // pagination params
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const skip = (page - 1) * limit;

    // 1) Users (simple text score, paged)
    const users = await User.aggregate([
      {
        $search: {
          text: {
            query: q,
            path: ['firstName', 'lastName', 'email'],
            fuzzy: { maxEdits: 1 }
          }
        }
      },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          firstName: 1,
          lastName: 1,
          avatarUrl: 1
        }
      }
    ]);

    // 2) Posts (text search + highlight, paged)
    const rawPosts = await Post.aggregate([
      {
        $search: {
          text: {
            query: q,
            path: ['content', 'hashtags'],
            fuzzy: { maxEdits: 1 }
          },
          highlight: { path: 'content' }
        }
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          content: 1,
          author: 1,
          createdAt: 1,
          highlights: { $meta: 'searchHighlights' }
        }
      }
    ]);

    // 3) Hashtags (prefix regex, paged)
    const hashtags = await Hashtag.find({ tag: new RegExp(q, 'i') })
      .skip(skip)
      .limit(limit)
      .select('tag -_id');

    // filter posts by visibility
    const posts = [];
    for (let post of rawPosts) {
      if (await canViewPost(req.user._id, post)) {
        // flatten first highlight excerpt if exists
        const snippet =
          post.highlights?.[0]?.texts
            .filter(t => t.type === 'hit')
            .map(t => t.value)
            .join('…') || '';
        posts.push({
          _id: post._id,
          content: post.content,
          author: post.author,
          createdAt: post.createdAt,
          snippet
        });
      }
    }

    res.json({
      page,
      limit,
      users,
      posts,
      hashtags: hashtags.map(h => h.tag)
    });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── Autocomplete suggestions (regex prefix) ───────────────────────────────
router.get('/suggestions', authMiddleware, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json({ users: [], hashtags: [] });

    const regex = new RegExp(`^${q}`, 'i');

    const [users, tags] = await Promise.all([
      User.find({
        $or: [{ firstName: regex }, { lastName: regex }]
      })
        .select('firstName lastName -_id')
        .limit(5),

      Hashtag.find({ tag: regex })
        .select('tag -_id')
        .limit(5)
    ]);

    res.json({
      users,
      hashtags: tags.map(t => t.tag)
    });
  } catch (err) {
    console.error('Suggestions error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
