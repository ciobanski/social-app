const mongoose = require('mongoose');
const { applyTZTransform } = require('./Utils');
const userSchema = new mongoose.Schema(
  {
    // ── Name fields ────────────────────────────────────────────────
    firstName: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 30
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 30
    },

    // ── Core auth fields ───────────────────────────────────────────
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
      default: true
    },
    twoFactorCode: String,
    twoFactorCodeExpires: Date,

    // ── Trusted devices for 2FA ─────────────────────────────
    trustedDevices: [
      {
        deviceId: {
          type: String,
          required: true
        },
        expires: {
          type: Date,
          required: true
        }
      }
    ],

    // ── Refresh tokens ──────────────────────────────────────
    refreshTokens: [
      {
        token: String,
        expires: Date
      }
    ],

    // ── Friend system ─────────────────────────────────────────
    // Incoming requests
    friendRequests: [
      {
        from: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    // Established friends
    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ]

  },


  { timestamps: true }
);

// Virtual fullName
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.index(
  { firstName: 'text', lastName: 'text', email: 'text' },
  { name: 'UserTextIndex' }
);

applyTZTransform(userSchema);

module.exports = mongoose.model('User', userSchema);
