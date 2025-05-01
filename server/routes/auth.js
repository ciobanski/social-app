const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const crypto = require('crypto');

const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const { sendMail } = require('../utils/mail');

const router = express.Router();

// Password strength regex (≥8 chars, 1 uppercase, 1 number)
const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

// ── POST /api/auth/signup ────────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    // 1. Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          'Password must be at least 8 characters long, include at least one uppercase letter and one number'
      });
    }
    if (await User.findOne({ email })) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    // 2. Create unverified user
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash });

    // 3. Generate & store email‐verify token (24h)
    user.verifyToken = crypto.randomBytes(32).toString('hex');
    user.verifyTokenExpires = Date.now() + 24 * 3600 * 1000;
    await user.save();

    // 4. Send verification email
    const link = `${process.env.BACKEND_URL}/api/auth/verify-email?token=${user.verifyToken}`;

    await sendMail({
      to: user.email,
      subject: 'Please verify your email',
      html: `<p>Hi ${user.name},</p>
             <p>Click <a href="${link}">here</a> to verify your account (expires in 24h).</p>`
    });

    // 5. Respond with basic profile (unverified)
    res.status(201).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Server error during signup' });
  }
});

// ── GET /api/auth/verify-email?token=... ────────────────────────────────────
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ message: 'Verification token is required' });
    }
    const user = await User.findOne({
      verifyToken: token,
      verifyTokenExpires: { $gt: Date.now() }
    });
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }
    user.isVerified = true;
    user.verifyToken = undefined;
    user.verifyTokenExpires = undefined;
    await user.save();
    res.json({ message: 'Email successfully verified! You can now log in.' });
  } catch (err) {
    console.error('Verify-email error:', err);
    res.status(500).json({ message: 'Server error during email verification' });
  }
});

// ── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    // 1. Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    // 2. Check verified
    if (!user.isVerified) {
      return res.status(403).json({ message: 'Please verify your email before logging in' });
    }
    // 3. Compare password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    // 4. Sign JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    // 5. Respond
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// ── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// ── GET /api/auth/google ───────────────────────────────────────────────────
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// ── GET /api/auth/google/callback ──────────────────────────────────────────
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/api/auth/login' }),
  (req, res) => {
    const token = jwt.sign(
      { userId: req.user._id, role: req.user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      token,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role
      }
    });
  }
);

module.exports = router;
