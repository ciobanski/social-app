// server/models/Notification.js
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
    enum: [
      'mention',
      'like',
      'share',
      'comment',
      'follow',
      'dm',
      'friend_request',
      'friend_accept',
      'comment_reply',
      'comment_like'
    ],
    required: true
  },
  entity: {
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    comment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment' },
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  read: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// if you have a timezone transform helper
applyTZTransform(notificationSchema);

module.exports = mongoose.model('Notification', notificationSchema);
