// server/models/Message.js
const mongoose = require('mongoose');
const { applyTZTransform } = require('./Utils');

const messageSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, trim: true, default: '' },
  read: { type: Boolean, default: false },
  // ← new fields for media
  mediaUrls: [{ type: String }],
  mediaType: { type: String, enum: ['image', 'video', null], default: null },
}, { timestamps: true });

applyTZTransform(messageSchema);

module.exports = mongoose.model('Message', messageSchema);
