const mongoose = require('mongoose');
const { applyTZTransform } = require('./Utils');
const storySchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mediaUrl: {
    type: String, // S3 or CDN URL of the image/video
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  }
}, { timestamps: true });

// Automatically delete expired stories
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

applyTZTransform(storySchema);

module.exports = mongoose.model('Story', storySchema);
