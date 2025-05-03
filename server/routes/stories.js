const express = require('express');
const Story = require('../models/Story');
const auth = require('../middleware/auth');

const router = express.Router();

// POST /api/stories — upload a new story
router.post('/', auth, async (req, res) => {
  const { mediaUrl } = req.body;
  if (!mediaUrl) return res.status(400).json({ message: 'mediaUrl is required' });

  const story = await Story.create({
    author: req.user._id,
    mediaUrl,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
  });

  res.status(201).json(story);
});

// GET /api/stories — fetch all unexpired stories from friends/followed
router.get('/', auth, async (req, res) => {
  // For now: fetch everyone’s stories; later restrict to friends
  const stories = await Story.find({ expiresAt: { $gt: new Date() } })
    .sort({ createdAt: -1 })
    .populate('author', 'firstName lastName avatarUrl');
  res.json(stories);
});

module.exports = router;
