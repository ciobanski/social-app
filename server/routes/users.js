const express = require('express');
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Report = require('../models/Report');
const auth = require('../middleware/auth');

const router = express.Router();

/**
 * DELETE /api/users/me
 * Deletes the logged-in user and their related data.
 */
router.delete('/me', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    // Remove the user
    await User.deleteOne({ _id: userId });

    // Cascade-delete their content
    await Post.deleteMany({ author: userId });
    await Comment.deleteMany({ author: userId });
    await Report.deleteMany({ reporter: userId });

    // (Optional) Remove any reports targeting them:
    // await Report.deleteMany({ targetType: 'User', targetId: userId });

    res.json({ message: 'Your account and all related data have been deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
