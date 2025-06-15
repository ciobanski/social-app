/* eslint-disable consistent-return */
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const crypto = require('crypto');

const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const { sendMail } = require('../utils/mail');
const { randomHex } = require('../utils/random');   // crypto helper

const router = express.Router();

/* ───────────── helpers & constants ───────────── */
const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;   // ≥8 chars, 1 upper, 1 digit
const authCookieOpt = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,     // 7 days  
  path: '/',
};

/* ─────────────────── SIGN-UP ─────────────────── */
router.post('/signup', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    if (!firstName || !lastName || !email || !password)
      return res.status(400).json({ message: 'All fields required' });

    if (firstName.length > 30 || lastName.length > 30)
      return res.status(400).json({ message: 'Names must be ≤30 chars' });

    if (!passwordRegex.test(password))
      return res.status(400).json({ message: 'Password ≥8 chars, 1 uppercase & 1 number' });

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
      html: `<p>Hi ${user.firstName},</p><p>Click <a href="${link}">here</a> to verify (expires in 24 h).</p>`,
    });

    res.status(201).json({ ...dto(user), isVerified: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ─────────── VERIFY EMAIL ─────────── */
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ message: 'Token required' });

    const user = await User.findOne({
      verifyToken: token, verifyTokenExpires: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ message: 'Invalid/expired token' });

    user.isVerified = true;
    user.verifyToken = undefined;
    user.verifyTokenExpires = undefined;
    await user.save();
    res.json({ message: 'Email verified — you can log in.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ─────────────────── LOGIN ─────────────────── */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email & password required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    if (!user.isVerified) return res.status(403).json({ message: 'Verify e-mail first' });
    if (!(await bcrypt.compare(password, user.passwordHash)))
      return res.status(401).json({ message: 'Invalid credentials' });

    /* ―― 2-FA check ―― */
    const trusted = user.trustedDevices.find(
      d => d.deviceId === req.cookies.deviceToken && d.expires > Date.now()
    );

    if (user.twoFactorEnabled && !trusted) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      user.twoFactorCode = code;
      user.twoFactorCodeExpires = Date.now() + 5 * 60 * 1000;
      await user.save();

      await sendMail({
        to: user.email,
        subject: 'Your 2-FA code',
        html: `<p>Your login code is <b>${code}</b>. Expires in 5 minutes.</p>`,
      });

      return res.json({ require2fa: true, userId: user._id });
    }

    /* ―― issue cookie ―― */
    const token = jwt.sign({ userId: user._id, role: user.role },
      process.env.JWT_SECRET, { expiresIn: '7d' });
    res.cookie('authToken', token, authCookieOpt);
    res.json({ user: dto(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ─────────── /me ─────────── */
router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: dto(req.user) });
});

/* ═══════════ GOOGLE OAUTH ═══════════ */
router.get('/google',
  passport.authenticate('google', {
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    session: false,
  })
);

router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  (req, res) => {
    const token = jwt.sign(
      { userId: req.user._id, role: req.user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.cookie('authToken', token, authCookieOpt);
    res.redirect(`${process.env.CLIENT_ORIGIN}/?g=1`);
  }
);

/* ─────────── PASSWORD RESET (request) ─────────── */
router.post('/request-password-reset', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });

    const user = await User.findOne({ email });
    if (user) {
      user.resetPasswordToken = crypto.randomBytes(32).toString('hex');
      user.resetPasswordExpires = Date.now() + 3600 * 1000;
      await user.save();

      const link = `${process.env.CLIENT_ORIGIN}/reset-password?token=${user.resetPasswordToken}`;
      await sendMail({
        to: user.email,
        subject: 'Reset your password',
        html: `<p>Click <a href="${link}">here</a> to reset (1 h expiry).</p>`,
      });
    }
    res.json({ message: 'If that e-mail exists, a reset link was sent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* reset-link pre-flight */
router.get('/check-reset-token', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.json({ ok: false });

  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() },
  }).select('_id');
  res.json({ ok: !!user });
});

/* perform reset */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword)
      return res.status(400).json({ message: 'Token & newPassword required' });

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ message: 'Invalid/expired token' });

    if (!passwordRegex.test(newPassword))
      return res.status(400).json({ message: 'Password ≥8 chars, 1 upper, 1 digit' });

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.refreshTokens = [];
    await user.save();

    res.json({ message: 'Password reset — log in.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ─────────── VERIFY 2-FA ─────────── */
router.post('/verify-2fa', async (req, res) => {
  try {
    const { userId, code, rememberDevice } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(400).json({ message: 'User not found' });

    if (!user.twoFactorCodeExpires || user.twoFactorCodeExpires < Date.now())
      return res.status(400).json({ message: 'Code expired' });
    if (user.twoFactorCode !== code)
      return res.status(400).json({ message: 'Invalid code' });

    user.twoFactorCode = undefined;
    user.twoFactorCodeExpires = undefined;

    if (rememberDevice) {
      const newDeviceId = randomHex(16);
      user.trustedDevices.push({
        deviceId: newDeviceId,
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      res.cookie('deviceToken', newDeviceId, {
        httpOnly: true, sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
    }

    await user.save();

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.cookie('authToken', token, authCookieOpt);
    res.json({ ok: true, user: dto(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* enable / disable 2-FA */
router.post('/enable-2fa', authMiddleware, async (req, res) => {
  const user = await User.findById(req.user._id);
  user.twoFactorEnabled = Boolean(req.body.enabled);
  await user.save();
  res.json({ twoFactorEnabled: user.twoFactorEnabled });
});

/* ─────────── REFRESH TOKEN (unchanged) ─────────── */
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: 'Refresh token required' });

    const user = await User.findOne({ 'refreshTokens.token': refreshToken });
    if (!user) return res.status(401).json({ message: 'Invalid refresh token' });

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
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ─────────── LOGOUT ─────────── */
router.post('/logout', (req, res) => {
  const clearOpt = {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/', // must match the path you used when setting the cookie
  };

  // Clear the authToken cookie
  res.clearCookie('authToken', clearOpt);

  // Done!
  return res.sendStatus(200);
});

module.exports = router;

/* helper: map user to DTO */
function dto(u) {
  return {
    id: u._id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    role: u.role,
  };
}
