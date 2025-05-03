const mongoose = require('mongoose');
const { applyTZTransform } = require('./Utils');
const commentSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null   // null for top-level comments, or point to another comment for replies
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    }
  },
  { timestamps: true }
);

applyTZTransform(commentSchema);

module.exports = mongoose.model('Comment', commentSchema);
