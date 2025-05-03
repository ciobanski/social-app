const mongoose = require('mongoose');
const { applyTZTransform } = require('./Utils');
const messageSchema = new mongoose.Schema(
  {
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      trim: true
    }
  },
  { timestamps: true }
);

applyTZTransform(messageSchema);

module.exports = mongoose.model('Message', messageSchema);
