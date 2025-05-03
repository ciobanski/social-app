const mongoose = require('mongoose');
const { applyTZTransform } = require('./Utils');
const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    targetType: {
      type: String,
      enum: ['User', 'Post', 'Comment'],
      required: true
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    reason: {
      type: String,
      required: true,
      maxlength: 500
    },
    resolved: {
      type: Boolean,
      default: false
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedAt: Date
  },
  { timestamps: true }
);

applyTZTransform(reportSchema);

module.exports = mongoose.model('Report', reportSchema);