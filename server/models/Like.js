const mongoose = require('mongoose');
const { applyTZTransform } = require('./Utils');
const likeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true
    }
  },
  { timestamps: true }
);

// Ensure one like per user/post pair
likeSchema.index({ user: 1, post: 1 }, { unique: true });

applyTZTransform(likeSchema);

module.exports = mongoose.model('Like', likeSchema);
