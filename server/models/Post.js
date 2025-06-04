// server/models/Post.js
const mongoose = require('mongoose');
const { applyTZTransform } = require('./Utils');

const postSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: {
      type: String,
      trim: true,
      // ↑ Changed from maxlength: 1000 to a larger limit (or remove it)
      maxlength: 2000,   // ← e.g. allow up to 2000 characters
      // OR simply comment out maxlength if you want no limit:
      // maxlength: undefined,
    },
    imageUrls: [String], // array of Cloudinary URLs
    hashtags: [String],
    visibility: {
      type: String,
      enum: ['public', 'friends', 'private'],
      default: 'public',
    },
  },
  { timestamps: true }
);

// Preserve your existing timezone‐transform so dates come back in “DD-MM-YYYY HH:mm:ss”
applyTZTransform(postSchema);

module.exports = mongoose.model('Post', postSchema);
