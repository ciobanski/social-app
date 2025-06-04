// server/models/CommentLike.js
const mongoose = require('mongoose');

const commentLikeSchema = new mongoose.Schema(
  {
    comment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Prevent the same user from liking the same comment twice
commentLikeSchema.index({ comment: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('CommentLike', commentLikeSchema);
