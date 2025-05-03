const mongoose = require('mongoose');
const { applyTZTransform } = require('./Utils');
const shareSchema = new mongoose.Schema({
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
}, { timestamps: true });

// ensure one share per user/post
shareSchema.index({ user: 1, post: 1 }, { unique: true });

applyTZTransform(shareSchema);

module.exports = mongoose.model('Share', shareSchema);
