// models/LoginEvent.js

const mongoose = require('mongoose');

const loginEventSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    // only createdAt is needed
    timestamps: { createdAt: true, updatedAt: false }
  }
);

module.exports = mongoose.model('LoginEvent', loginEventSchema);
