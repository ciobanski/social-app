// routes/auth.js
/* eslint-disable consistent-return */
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const crypto = require('crypto');

const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const { sendMail } = require('../utils/mail');

const router = express.Router();

/* ────────────────────────────────  Helpers / Constants  ─────────────────────────────── */
const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;   // ≥8 chars, 1 uppercase, 1 number

/* ──────────────────────────────────────────────  SIGN-UP  ───────────────────────────────────────────── */
router.post('/signup', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !lastName || !email || !password)
      return res.status(400).json({ message: 'First name, last name, email, and password are required' });

    if (firstName.length > 30 || lastName.length > 30)
      return res.status(400).json({ message: 'First and last names must each be at most 30 characters' });

    if (!passwordRegex.test(password))
      return res.status(400).json({
        message: 'Password must be at least 8 characters long, include an uppercase letter and a number',
      });

    if (await User.findOne({ email }))
      return res.status(409).json({ message: 'Email already in use' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ firstName, lastName, email, passwordHash });

    user.verifyToken = crypto.randomBytes(32).toString('hex');
    user.verifyTokenExpires = Date.now() + 24 * 3600 * 1000;
    await user.save();

    const link = `${process.env.BACKEND_URL}/api/auth/verify-email?token=${user.verifyToken}`;
    await sendMail({
      to: user.email,
      subject: 'Please verify your email',
      html: `<p>Hi ${user.firstName},</p>
             <p>Click <a href="${link}">here</a> to verify your account (expires in 24h).</p>`,
    });

    return res.status(201).json({
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ message: 'Server error during signup' });
  }
});

/* ─────────────────────────────────────  VERIFY EMAIL  ───────────────────────────────────── */
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ message: 'Verification token is required' });

    const user = await User.findOne({
      verifyToken: token,
      verifyTokenExpires: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

    user.isVerified = true;
    user.verifyToken = undefined;
    user.verifyTokenExpires = undefined;
    await user.save();

    return res.json({ message: 'Email successfully verified! You can now log in.' });
  } catch (err) {
    console.error('Verify-email error:', err);
    return res.status(500).json({ message: 'Server error during email verification' });
  }
});

/* ──────────────────────────────────────────────  LOGIN  ─────────────────────────────────────────────── */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    if (!user.isVerified) return res.status(403).json({ message: 'Please verify your email before logging in' });
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.cookie('authToken', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const LoginEvent = require('../models/LoginEvent');
    await LoginEvent.create({ user: user._id });

    return res.json({
      token, // left for backwards-compat
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error during login' });
  }
});

/* ────────────────────────────────────────────────  ME  ──────────────────────────────────────────────── */
router.get('/me', authMiddleware, (req, res) => {
  const u = req.user;
  return res.json({
    user: {
      id: u._id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      role: u.role,
    },
  });
});

/* ════════════════════════════  GOOGLE OAUTH  ══════════════════════════════════════════════ */

// Kick-off
router.get(
  '/google',
  passport.authenticate('google', {
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    session: false,
  })
);

// Callback
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false }),
  (req, res) => {
    const token = jwt.sign(
      { userId: req.user._id, role: req.user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('authToken', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.redirect(`${process.env.CLIENT_ORIGIN}/?g=1`);
  }
);

/* ──────────────────────────────────  REQUEST PASSWORD RESET  ───────────────────────────────── */
router.post('/request-password-reset', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email });
    if (user) {
      user.resetPasswordToken = crypto.randomBytes(32).toString('hex');
      user.resetPasswordExpires = Date.now() + 3600 * 1000; // 1 hour
      await user.save();

      const link = `${process.env.CLIENT_ORIGIN}/reset-password?token=${user.resetPasswordToken}`;
      console.log(`🔑 Password reset link (DEV): ${link}`);
      await sendMail({
        to: user.email,
        subject: 'Reset your password',
        html: `<p>Click <a href="${link}">here</a> to reset (1h).</p>`,
      });
    }
    return res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('Request-password-reset error:', err);
    return res.status(500).json({ message: 'Server error during password reset request' });
  }
});

/* ───────────────────────────────────────  RESET PASSWORD  ───────────────────────────────────────── */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword)
      return res.status(400).json({ message: 'Token and new password are required' });

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ message: 'Invalid or expired reset token' });

    if (!passwordRegex.test(newPassword))
      return res.status(400).json({
        message: 'Password must be at least 8 chars, include uppercase & number',
      });

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.refreshTokens = [];
    await user.save();

    return res.json({ message: 'Password reset! Please log in.' });
  } catch (err) {
    console.error('Reset-password error:', err);
    return res.status(500).json({ message: 'Server error during password reset' });
  }
});

/* ───────────────────────────────────────────  2FA - Request Code  ───────────────────────────────────── */
router.post('/request-2fa', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    const deviceId = req.cookies.deviceToken;
    if (deviceId) {
      const trusted = user.trustedDevices.find(
        (d) => d.deviceId === deviceId && d.expires > Date.now()
      );
      if (trusted) return res.json({ message: 'Device already verified—no OTP needed.' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.twoFactorCode = code;
    user.twoFactorCodeExpires = Date.now() + 5 * 60 * 1000;
    await user.save();

    await sendMail({
      to: user.email,
      subject: 'Your 2FA Code',
      html: `<p>Your login code is <strong>${code}</strong>. Expires in 5 minutes.</p>`,
    });

    return res.json({ message: '2FA code sent via email' });
  } catch (err) {
    console.error('Request-2fa error:', err);
    return res.status(500).json({ message: 'Server error when requesting 2FA code' });
  }
});

/* ───────────────────────────────────────────  2FA - Verify Code  ───────────────────────────────────── */
router.post('/verify-2fa', authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;
    const user = await User.findById(req.user._id);

    if (!user.twoFactorEnabled)
      return res.status(400).json({ message: '2FA not enabled' });
    if (user.twoFactorCode !== code || user.twoFactorCodeExpires < Date.now())
      return res.status(400).json({ message: 'Invalid or expired code' });

    user.twoFactorCode = undefined;
    user.twoFactorCodeExpires = undefined;

    const newDeviceId = crypto.randomBytes(16).toString('hex');
    user.trustedDevices.push({
      deviceId: newDeviceId,
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    const accessToken = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );
    const refreshToken = crypto.randomBytes(32).toString('hex');
    user.refreshTokens.push({
      token: refreshToken,
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    await user.save();

    res.cookie('deviceToken', newDeviceId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      token: accessToken,
      refreshToken,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Verify-2fa error:', err);
    return res.status(500).json({ message: 'Server error during 2FA verification' });
  }
});

/* ───────────────────────────────────────  REFRESH TOKEN  ───────────────────────────────────────────── */
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: 'Refresh token required' });

    const user = await User.findOne({ 'refreshTokens.token': refreshToken });
    if (!user) return res.status(401).json({ message: 'Invalid refresh token' });

    user.refreshTokens = user.refreshTokens.filter((rt) => rt.expires > Date.now());
    const stored = user.refreshTokens.find((rt) => rt.token === refreshToken);
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

    return res.json({ token: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    console.error('Refresh-token error:', err);
    return res.status(500).json({ message: 'Server error during token refresh' });
  }
});

/* ───────────────────────────────────────────  LOGOUT  ──────────────────────────────────────────────── */
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) return res.sendStatus(204);

    const user = await User.findById(req.user._id);
    user.refreshTokens = user.refreshTokens.filter((rt) => rt.token !== refreshToken);
    await user.save();
    res.clearCookie('authToken', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    res.sendStatus(204);
  } catch (err) {
    console.error('Logout error:', err);
    return res.status(500).json({ message: 'Server error during logout' });
  }
});

module.exports = router;
