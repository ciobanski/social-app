// server/routes/notifications.js
const express = require('express');
const auth = require('../middleware/auth');
const Notification = require('../models/Notification');
const router = express.Router();

router.use(auth);

router.get('/', async (req, res) => {
  // 1️⃣ Check that auth really gave you a user
  console.log('🔔 GET /api/notifications, req.user =', req.user);

  if (!req.user || !req.user._id) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    // 2️⃣ Log the query you’re about to run
    console.log(`🔔 Fetching notifications for user ${req.user._id}`);

    const notes = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('entity.from', 'firstName lastName avatarUrl');

    console.log('🔔 Found notifications:', notes.length);
    return res.json({ notifications: notes });
  } catch (err) {
    // 3️⃣ Log the full stack so you can see what line is bomb­ing
    console.error('🔴 GET /api/notifications error:', err.stack || err);
    return res.status(500).json({ message: 'Could not load notifications' });
  }
});

module.exports = router;
