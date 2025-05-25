// routes/users.js

const express = require('express');
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Report = require('../models/Report');
const auth = require('../middleware/auth');
const { canViewField } = require('../utils/privacy');

const router = express.Router();

/**
 * GET /api/users/me
 * Return your own profile, including country and birthday
 */
router.get('/me', auth, async (req, res) => {
  try {
    const me = await User.findById(req.user._id).select(
      '-passwordHash -verifyToken -verifyTokenExpires ' +
      '-resetPasswordToken -resetPasswordExpires ' +
      '-twoFactorCode -twoFactorCodeExpires ' +
      '-trustedDevices -refreshTokens'
    );
    if (!me) return res.status(404).json({ message: 'User not found' });

    res.json({
      id: me._id,
      firstName: me.firstName,
      lastName: me.lastName,
      avatarUrl: me.avatarUrl,
      email: me.email,
      role: me.role,
      country: me.country,
      birthday: me.birthday,
      birthdayVisibility: me.birthdayVisibility,
      createdAt: me.createdAt
    });
  } catch (err) {
    console.error('Get /me error:', err);
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
    if (birthday) updates.birthday = birthday;
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

/**
 * GET /api/users/:id
 * Public profile—country always shown; birthday per visibility
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const viewerId = req.user._id;
    const user = await User.findById(req.params.id).select(
      'firstName lastName avatarUrl friends country birthday birthdayVisibility'
    );
    if (!user) return res.status(404).json({ message: 'User not found' });

    const profile = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      country: user.country
    };

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

module.exports = router;
