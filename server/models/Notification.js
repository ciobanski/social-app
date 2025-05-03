const mongoose = require('mongoose');
const { applyTZTransform } = require('./Utils');
const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['mention', 'like', 'share', 'comment', 'follow', 'dm'],
    required: true
  },
  entity: {
    // you can store postId, commentId, fromUserId, etc.
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    comment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment' },
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  read: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

applyTZTransform(notificationSchema);

module.exports = mongoose.model('Notification', notificationSchema);
