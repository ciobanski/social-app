// routes/users.js

const express = require('express');
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Report = require('../models/Report');
const auth = require('../middleware/auth');
const { canViewField, canViewPost } = require('../utils/privacy');
const multer = require('multer');
const { avatarStorage } = require('../config/cloudinary');

const router = express.Router();

/**
 * GET /api/users/me
 * Return your own profile, including country and birthday
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const viewerId = req.user._id.toString();    // guaranteed by auth
    const targetId = req.params.id;

    const user = await User.findById(targetId)
      .select('firstName lastName avatarUrl friends country birthday birthdayVisibility');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const profile = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      country: user.country,
      friends: user.friends,              // array of ObjectIds
      friendCount: user.friends.length,
    };

    // Own profile?  Always show birthday
    if (viewerId === targetId) {
      profile.birthday = user.birthday;
    }
    // Otherwise, enforce visibility rules
    else if (
      user.birthday &&
      await canViewField(viewerId, user, user.birthdayVisibility)
    ) {
      profile.birthday = user.birthday;
    }

    res.json(profile);
  } catch (err) {
    console.error('Get /:id error:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * PUT /api/users/me
 * Update your profile (incl. country & birthday settings)
 */
router.put('/me', auth, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      avatarUrl,
      country,
      birthday,
      birthdayVisibility
    } = req.body;

    const updates = {};
    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (avatarUrl) updates.avatarUrl = avatarUrl;
    if (country !== undefined) updates.country = country;
    if (birthday !== undefined) updates.birthday = birthday;
    if (birthdayVisibility) updates.birthdayVisibility = birthdayVisibility;

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true }
    );

    res.json({
      id: updated._id,
      firstName: updated.firstName,
      lastName: updated.lastName,
      avatarUrl: updated.avatarUrl,
      country: updated.country,
      birthday: updated.birthday,
      birthdayVisibility: updated.birthdayVisibility
    });
  } catch (err) {
    console.error('Put /me error:', err);
    res.status(500).json({ message: err.message });
  }
});

const upload = multer({ storage: avatarStorage });
router.post(
  '/me/avatar',
  auth,
  upload.single('avatar'),
  async (req, res) => {
    try {
      // multer-storage-cloudinary sets `req.file.path` to the
      // secure Cloudinary URL (e.g. https://res.cloudinary.com/…)
      const url = req.file.path;
      await User.findByIdAndUpdate(req.user._id, { avatarUrl: url });
      res.json({ avatarUrl: url });
    } catch (err) {
      console.error('Upload avatar error:', err);
      res.status(500).json({ message: 'Could not upload avatar' });
    }
  }
);


router.get('/:id', async (req, res) => {
  try {
    // if someone is logged in, auth middleware would have set req.user
    const viewerId = req.user?._id || null;

    const user = await User.findById(req.params.id)
      .select('firstName lastName avatarUrl friends country birthday birthdayVisibility');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const profile = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      country: user.country
    };

    // Only show birthday if visibility rules allow
    if (
      user.birthday &&
      (await canViewField(viewerId, user, user.birthdayVisibility))
    ) {
      profile.birthday = user.birthday;
    }

    res.json(profile);
  } catch (err) {
    console.error('Get /:id error:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * DELETE /api/users/me
 * (unchanged)
 */
router.delete('/me', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    await User.deleteOne({ _id: userId });
    await Post.deleteMany({ author: userId });
    await Comment.deleteMany({ author: userId });
    await Report.deleteMany({ reporter: userId });
    res.json({ message: 'Your account and all related data have been deleted.' });
  } catch (err) {
    console.error('Delete /me error:', err);
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id/posts', auth, async (req, res) => {
  try {
    const viewerId = req.user._id;
    // grab their posts newest first
    const posts = await Post.find({ author: req.params.id })
      .sort({ createdAt: -1 })
      .populate('author', 'firstName lastName avatarUrl');

    // filter by privacy
    const visible = [];
    for (let post of posts) {
      if (await canViewPost(viewerId, post)) {
        visible.push(post);
      }
    }

    res.json(visible);
  } catch (err) {
    console.error('Get /:id/posts error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
