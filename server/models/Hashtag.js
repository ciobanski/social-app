const mongoose = require('mongoose');
const { applyTZTransform } = require('./Utils');
const tagSchema = new mongoose.Schema({
  tag: { type: String, unique: true, index: true },
  count: { type: Number, default: 0 }
});

applyTZTransform(tagSchema);

module.exports = mongoose.model('Hashtag', tagSchema);
