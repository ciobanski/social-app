const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 50
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 5,
      match: /.+\@.+\..+/
    },
    passwordHash: {
      type: String,
      required: function () {
        return !this.googleId;
      }
    },
    avatarUrl: String,
    googleId: String,
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    },

    // ── Email verification ───────────────────────────────────
    isVerified: {
      type: Boolean,
      default: false
    },
    verifyToken: String,
    verifyTokenExpires: Date,

    // ── Password reset ──────────────────────────────────────
    resetPasswordToken: String,
    resetPasswordExpires: Date,

    // ── Two-factor via email OTP ────────────────────────────
    twoFactorEnabled: {
      type: Boolean,
      default: false
    },
    twoFactorCode: String,
    twoFactorCodeExpires: Date,

    // ── Refresh tokens ──────────────────────────────────────
    refreshTokens: [
      {
        token: String,
        expires: Date
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
