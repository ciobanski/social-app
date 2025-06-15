// server/models/Post.js
const mongoose = require('mongoose');
const { applyTZTransform } = require('./Utils');

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,  // ← fix here
      ref: 'User',
      required: true
    },

    content: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    imageUrls: { type: [String], default: [] },
    videoUrls: { type: [String], default: [] },
    hashtags: { type: [String], default: [] },
    visibility: {
      type: String,
      enum: ['public', 'friends', 'private'],
      default: 'public',
    },
  },
  { timestamps: true }
);

applyTZTransform(postSchema);

module.exports = mongoose.model('Post', postSchema);
