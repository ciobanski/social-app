// server/routes/search.js

const express = require('express');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ── Full-text user search with pagination ───────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) {
      return res.json({ page: 1, limit: 0, users: [] });
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const skip = (page - 1) * limit;

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

    res.json({ page, limit, users });
  } catch (err) {
    console.error('Search users error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── Autocomplete user suggestions ────────────────────────────────────
router.get('/suggestions', authMiddleware, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) {
      return res.json({ users: [] });
    }

    const regex = new RegExp(`^${q}`, 'i');
    const users = await User.find({
      $or: [{ firstName: regex }, { lastName: regex }]
    })
      .select('_id firstName lastName avatarUrl')
      .limit(5);

    res.json({ users });
  } catch (err) {
    console.error('Suggestions error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
