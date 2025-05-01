const mongoose = require('mongoose');

const saveSchema = new mongoose.Schema(
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

// Ensure one save per user/post pair
saveSchema.index({ user: 1, post: 1 }, { unique: true });

module.exports = mongoose.model('Save', saveSchema);
