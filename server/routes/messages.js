const express = require('express');
const Message = require('../models/Message');
const auth = require('../middleware/auth');
const multer = require('multer');
const { postStorage } = require('../config/cloudinary'); // your existing multer-cloudinary setup
const parser = multer({ postStorage });
const router = express.Router();

const uploadMedia = multer({
  storage: postStorage,
  limits: { fileSize: 25 * 1024 * 1024 }
}).array('media', 5);
/**
 * GET /api/messages/unread-counts
 */
router.get('/unread-counts', auth, async (req, res) => {
  try {
    const agg = await Message.aggregate([
      { $match: { to: req.user._id, read: false } },
      { $group: { _id: '$from', count: { $sum: 1 } } }
    ]);
    const counts = {};
    agg.forEach(({ _id, count }) => {
      counts[_id.toString()] = count;
    });
    res.json(counts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/messages/:otherUserId
 * Fetch last 50 messages, then mark the ones *from* them as read.
 */
router.get('/:otherUserId', auth, async (req, res) => {
  try {
    const me = req.user._id.toString();
    const other = req.params.otherUserId;

    // 1) Fetch
    const messages = await Message.find({
      $or: [
        { from: me, to: other },
        { from: other, to: me }
      ]
    })
      .sort({ createdAt: 1 })
      .limit(50)
      .populate('from', 'firstName lastName avatarUrl')
      .lean();

    // 2) Mark their unread → read
    await Message.updateMany(
      { from: other, to: me, read: false },
      { $set: { read: true } }
    );

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:otherUserId/read', auth, async (req, res) => {
  try {
    const me = req.user._id.toString();
    const other = req.params.otherUserId;
    await Message.updateMany(
      { from: other, to: me, read: false },
      { $set: { read: true } }
    );
    res.sendStatus(204);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * POST /api/messages
 * Body: { to, content, mediaUrls?, mediaType? }
 * Creates a new message and returns it.
 */
router.post('/', auth, async (req, res) => {
  try {
    const from = req.user._id;
    const { to, content, mediaUrls, mediaType } = req.body;

    // create & save
    const msg = await Message.create({
      from,
      to,
      content,
      mediaUrls: mediaUrls || [],
      mediaType: mediaType || null,
      createdAt: new Date()
    });

    // you can do any notification/emit logic here, or let socket.io handle it
    res.json(msg);
  } catch (err) {
    console.error('POST /api/messages error:', err);
    res.status(500).json({ message: 'Could not send message' });
  }
});

router.post('/media', auth, (req, res) => {
  uploadMedia(req, res, err => {
    if (err) {
      console.error('Chat media upload error:', err);
      return res.status(400).json({ message: err.message });
    }
    const files = req.files || [];
    const urls = files.map(f => f.path);
    const type = files[0]?.mimetype.startsWith('video/') ? 'video' : 'image';
    res.json({ urls, type });
  });
});

module.exports = router;
