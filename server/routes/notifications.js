// routes/notifications.js
const express = require('express');
const auth = require('../middleware/auth');
const Notification = require('../models/Notification');
const router = express.Router();

router.use(auth);

router.get('/', async (req, res) => {
  // you might want to mark old ones “read” here, or provide a separate PATCH /notifications/:id/read
  const notes = await Notification.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('from', 'firstName lastName avatarUrl');
  res.json({ notifications: notes });
});

module.exports = router;
