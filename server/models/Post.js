// server/models/Post.js
const mongoose = require('mongoose');
const { applyTZTransform } = require('./Utils');

const postSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    imageUrls: { type: [String], default: [] }, // array of Cloudinary URLs
    videoUrls: { type: [String], default: [] }, // array of Cloudinary URLs for videos
    hashtags: { type: [String], default: [] },
    visibility: {
      type: String,
      enum: ['public', 'friends', 'private'],
      default: 'public',
    },
  },
  { timestamps: true }
);

// Preserve existing timezone transform
applyTZTransform(postSchema);

module.exports = mongoose.model('Post', postSchema);
