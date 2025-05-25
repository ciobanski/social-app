// routes/auth.js

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const crypto = require('crypto');

const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const { sendMail } = require('../utils/mail');

const router = express.Router();

// Password strength: ≥8 chars, 1 uppercase, 1 number
const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

// ── POST /api/auth/signup ────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    // Validate
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        message: 'First name, last name, email, and password are required'
      });
    }
    if (firstName.length > 30 || lastName.length > 30) {
      return res.status(400).json({
        message: 'First and last names must each be at most 30 characters'
      });
    }
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          'Password must be at least 8 characters long, include an uppercase letter and a number'
      });
    }
    if (await User.findOne({ email })) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    // Create unverified user
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      firstName,
      lastName,
      email,
      passwordHash
    });

    // Email verification token (24h)
    user.verifyToken = crypto.randomBytes(32).toString('hex');
    user.verifyTokenExpires = Date.now() + 24 * 3600 * 1000;
    await user.save();

    // Send verification email
    const link = `${process.env.BACKEND_URL}/api/auth/verify-email?token=${user.verifyToken}`;
    await sendMail({
      to: user.email,
      subject: 'Please verify your email',
      html: `<p>Hi ${user.firstName},</p>
             <p>Click <a href="${link}">here</a> to verify your account (expires in 24h).</p>`
    });

    res.status(201).json({
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Server error during signup' });
  }
});

// ── GET /api/auth/verify-email ────────────────────────────────────────────
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

// ── POST /api/auth/login ──────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    if (!user.isVerified) {
      return res.status(403).json({ message: 'Please verify your email before logging in' });
    }
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    // Issue JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Record login event
    const LoginEvent = require('../models/LoginEvent');
    await LoginEvent.create({ user: user._id });

    res.json({
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// ── GET /api/auth/me ───────────────────────────────────────────────────────
router.get('/me', authMiddleware, (req, res) => {
  const u = req.user;
  res.json({
    user: {
      id: u._id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      role: u.role
    }
  });
});

// ── Google OAuth ─────────────────────────────────────────────────────────────
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/api/auth/login' }),
  (req, res) => {
    const u = req.user;
    const token = jwt.sign(
      { userId: u._id, role: u.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      token,
      user: {
        id: u._id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        role: u.role
      }
    });
  }
);

// ── POST /api/auth/request-password-reset ─────────────────────────────────
router.post('/request-password-reset', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email });
    if (user) {
      user.resetPasswordToken = crypto.randomBytes(32).toString('hex');
      user.resetPasswordExpires = Date.now() + 3600 * 1000; // 1h
      await user.save();

      const link = `${process.env.BACKEND_URL}/api/auth/reset-password?token=${user.resetPasswordToken}`;
      console.log(`🔑 Password reset link (DEV): ${link}`);
      await sendMail({
        to: user.email,
        subject: 'Reset your password',
        html: `<p>Click <a href="${link}">here</a> to reset (1h).</p>`
      });
    }
    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('Request-password-reset error:', err);
    res.status(500).json({ message: 'Server error during password reset request' });
  }
});

// ── POST /api/auth/reset-password ─────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        message: 'Password must be at least 8 chars, include uppercase & number'
      });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.refreshTokens = [];
    await user.save();

    res.json({ message: 'Password reset! Please log in.' });
  } catch (err) {
    console.error('Reset-password error:', err);
    res.status(500).json({ message: 'Server error during password reset' });
  }
});

// ── POST /api/auth/request-2fa ─────────────────────────────────────────────
router.post('/request-2fa', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    // Skip OTP if device trusted
    const deviceId = req.cookies.deviceToken;
    if (deviceId) {
      const trusted = user.trustedDevices.find(d =>
        d.deviceId === deviceId && d.expires > Date.now()
      );
      if (trusted) {
        return res.json({ message: 'Device already verified—no OTP needed.' });
      }
    }

    // Generate & email OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.twoFactorCode = code;
    user.twoFactorCodeExpires = Date.now() + 5 * 60 * 1000;
    await user.save();

    await sendMail({
      to: user.email,
      subject: 'Your 2FA Code',
      html: `<p>Your login code is <strong>${code}</strong>. Expires in 5 minutes.</p>`
    });

    res.json({ message: '2FA code sent via email' });
  } catch (err) {
    console.error('Request-2fa error:', err);
    res.status(500).json({ message: 'Server error when requesting 2FA code' });
  }
});

// ── POST /api/auth/verify-2fa ───────────────────────────────────────────────
router.post('/verify-2fa', authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;
    const user = await User.findById(req.user._id);

    if (!user.twoFactorEnabled) {
      return res.status(400).json({ message: '2FA not enabled' });
    }
    if (user.twoFactorCode !== code || user.twoFactorCodeExpires < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired code' });
    }

    // Clear OTP
    user.twoFactorCode = undefined;
    user.twoFactorCodeExpires = undefined;

    // Trust device
    const newDeviceId = crypto.randomBytes(16).toString('hex');
    user.trustedDevices.push({
      deviceId: newDeviceId,
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });

    // Issue tokens
    const accessToken = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );
    const refreshToken = crypto.randomBytes(32).toString('hex');
    user.refreshTokens.push({
      token: refreshToken,
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    await user.save();

    // Set device cookie
    res.cookie('deviceToken', newDeviceId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.json({
      token: accessToken,
      refreshToken,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Verify-2fa error:', err);
    res.status(500).json({ message: 'Server error during 2FA verification' });
  }
});

// ── POST /api/auth/refresh-token ───────────────────────────────────────────
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token required' });
    }
    const user = await User.findOne({ 'refreshTokens.token': refreshToken });
    if (!user) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    user.refreshTokens = user.refreshTokens.filter(rt => rt.expires > Date.now());
    const stored = user.refreshTokens.find(rt => rt.token === refreshToken);
    if (!stored) {
      await user.save();
      return res.status(401).json({ message: 'Refresh token expired' });
    }

    const newAccessToken = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );
    const newRefreshToken = crypto.randomBytes(32).toString('hex');
    stored.token = newRefreshToken;
    stored.expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await user.save();

    res.json({ token: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    console.error('Refresh-token error:', err);
    res.status(500).json({ message: 'Server error during token refresh' });
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.sendStatus(204);

    const user = await User.findById(req.user._id);
    user.refreshTokens = user.refreshTokens.filter(rt => rt.token !== refreshToken);
    await user.save();

    res.sendStatus(204);
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ message: 'Server error during logout' });
  }
});

module.exports = router;
