const express = require('express');
const User = require('../models/User');
const Post = require('../models/Post');
const Hashtag = require('../models/Hashtag');

const router = express.Router();

// GET /api/search?q=...
router.get('/', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json({ users: [], posts: [], hashtags: [] });

  const [users, posts, tags] = await Promise.all([
    User.find({ $text: { $search: q } })
      .select('firstName lastName avatarUrl')
      .limit(10),
    Post.find({ $text: { $search: q } })
      .select('content author createdAt')
      .limit(10),
    Hashtag.find({ tag: new RegExp(q, 'i') })
      .limit(10)
  ]);

  res.json({
    users,
    posts,
    hashtags: tags.map(t => t.tag)
  });
});

// GET /api/search/suggestions?q=...
router.get('/suggestions', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json({ users: [], hashtags: [] });
  const regex = new RegExp(`^${q}`, 'i');

  const [users, tags] = await Promise.all([
    User.find({ $or: [{ firstName: regex }, { lastName: regex }] })
      .select('firstName lastName')
      .limit(5),
    Hashtag.find({ tag: regex })
      .limit(5)
  ]);

  res.json({
    users: users.map(u => ({ firstName: u.firstName, lastName: u.lastName })),
    hashtags: tags.map(t => t.tag)
  });
});

module.exports = router;
