// routes/admin.js

const express = require('express');
const Report = require('../models/Report');
const User = require('../models/User');
const Post = require('../models/Post');
const LoginEvent = require('../models/LoginEvent');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

const router = express.Router();

// Protect all admin routes
router.use(auth, admin);

/**
 * GET /api/admin/metrics
 * Return key platform analytics, including monthly breakdowns:
 */
router.get('/metrics', async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      1, 0, 0, 0, 0
    ));

    // Sign-up metrics
    const totalUsers = await User.countDocuments();
    const signupsThisMonth = await User.countDocuments({ createdAt: { $gte: monthStart } });

    // Post metrics
    const totalPosts = await Post.countDocuments();
    const postsThisMonth = await Post.countDocuments({ createdAt: { $gte: monthStart } });

    // Login metrics
    const totalLogins = await LoginEvent.countDocuments();
    const loginsThisMonth = await LoginEvent.countDocuments({ createdAt: { $gte: monthStart } });

    // Report & ban metrics
    const totalReports = await Report.countDocuments();
    const unresolvedReports = await Report.countDocuments({ resolved: false });
    const reportedPosts = (await Report.distinct('targetId', { targetType: 'Post' })).length;
    const bannedUsers = await User.countDocuments({ banned: true });

    res.json({
      // sign-ups
      totalUsers,
      signupsThisMonth,
      // posts
      totalPosts,
      postsThisMonth,
      // logins
      totalLogins,
      loginsThisMonth,
      // existing
      totalReports,
      unresolvedReports,
      reportedPosts,
      bannedUsers
    });
  } catch (err) {
    console.error('GET /api/admin/metrics error:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/admin/reports
 */
router.get('/reports', async (req, res) => {
  try {
    const reports = await Report.find({ resolved: false })
      .sort({ createdAt: -1 })
      .populate('reporter', 'firstName lastName email');
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * PATCH /api/admin/reports/:id/resolve
 */
router.patch('/reports/:id/resolve', async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });

    report.resolved = true;
    report.resolvedBy = req.user._id;
    report.resolvedAt = new Date();

    await report.save();
    res.json({ message: 'Report marked as resolved' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * PATCH /api/admin/users/:id/ban
 */
router.patch('/users/:id/ban', async (req, res) => {
  try {
    const { ban, reason, expires } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.banned = !!ban;
    user.banReason = ban ? reason : undefined;
    user.banExpires = expires ? new Date(expires) : undefined;

    await user.save();
    res.json({ message: ban ? 'User banned' : 'User unbanned' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * DELETE /api/admin/users/:id
 */
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    await user.deleteOne();
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
