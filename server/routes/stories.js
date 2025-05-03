const express = require('express');
const mongoose = require('mongoose');
const Story = require('../models/Story');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// ── POST /api/stories ────────────────────────────────────────────────────────
// Upload a new story
router.post('/', auth, async (req, res) => {
  const { mediaUrl } = req.body;
  if (!mediaUrl) {
    return res.status(400).json({ message: 'mediaUrl is required' });
  }

  const story = await Story.create({
    author: req.user._id,
    mediaUrl,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
  });

  res.status(201).json(story);
});

// ── GET /api/stories ─────────────────────────────────────────────────────────
// Fetch all unexpired stories from your friends
router.get('/', auth, async (req, res) => {
  // 1) Get your friends list
  const me = await User.findById(req.user._id).select('friends');
  // 2) Fetch stories by those friends only
  const stories = await Story.find({
    author: { $in: me.friends },
    expiresAt: { $gt: new Date() }
  })
    .sort({ createdAt: -1 })
    .populate('author', 'firstName lastName avatarUrl');

  res.json(stories);
});

// ── POST /api/stories/:id/seen ────────────────────────────────────────────────
// Mark a story as seen
router.post('/:id/seen', auth, async (req, res) => {
  const story = await Story.findById(req.params.id);
  if (!story) {
    return res.status(404).json({ message: 'Story not found' });
  }

  // Only non-authors can mark seen
  if (!story.author.equals(req.user._id)) {
    // Add to seenBy if not already there
    if (!story.seenBy.some(e => e.user.equals(req.user._id))) {
      story.seenBy.push({ user: req.user._id });
      await story.save();
    }
  }

  res.json({ message: 'Story marked as seen' });
});

// ── GET /api/stories/unread ──────────────────────────────────────────────────
// List authors with unread story counts & their latest story
router.get('/unread', auth, async (req, res) => {
  const me = req.user._id;

  // 1) Aggregate unread stories by author
  const agg = await Story.aggregate([
    // only unexpired
    { $match: { expiresAt: { $gt: new Date() } } },
    // only friends’ stories
    { $match: { author: { $in: (await User.findById(me).select('friends')).friends } } },
    // only those not seen by me
    { $match: { 'seenBy.user': { $ne: mongoose.Types.ObjectId(me) } } },
    // sort by newest first
    { $sort: { createdAt: -1 } },
    // group by author
    {
      $group: {
        _id: '$author',
        latestStory: { $first: '$$ROOT' },
        count: { $sum: 1 }
      }
    }
  ]);

  // 2) Populate author info on latestStory
  await User.populate(agg, {
    path: 'latestStory.author',
    select: 'firstName lastName avatarUrl'
  });

  // 3) Shape response
  const result = agg.map(g => ({
    author: g.latestStory.author,
    mediaUrl: g.latestStory.mediaUrl,
    count: g.count,
    latestAt: g.latestStory.createdAt
  }));

  res.json(result);
});

module.exports = router;
