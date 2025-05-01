const express = require('express');
const Report = require('../models/Report');
const User = require('../models/User');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

const router = express.Router();

// Apply auth + admin checks to all admin routes
router.use(auth, admin);

/**
 * GET /api/admin/reports
 * List all unresolved reports
 */
router.get('/reports', async (req, res) => {
  try {
    const reports = await Report.find({ resolved: false })
      .sort({ createdAt: -1 })
      .populate('reporter', 'name email');
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * PATCH /api/admin/reports/:id/resolve
 * Mark a report as resolved
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
 * Ban or unban a user
 * Body: { ban: boolean, reason?: string, expires?: ISODateString }
 */
router.patch('/users/:id/ban', async (req, res) => {
  try {
    const { ban, reason, expires } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.banned = ban === true;
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
 * Permanently delete a user
 * (You may also want to cascade-delete their posts/comments in future)
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
