const mongoose = require('mongoose');
const { applyTZTransform } = require('./Utils');

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      trim: true,
      maxlength: 280
    },

    // replace single imageUrl with an array
    imageUrls: [String],

    hashtags: [String],

    visibility: {
      type: String,
      enum: ['public', 'friends', 'private'],
      default: 'public'
    }
  },
  { timestamps: true }
);

// indexes/transforms
postSchema.add({
  hashtags: [{ type: String, index: true }]
});
postSchema.index({ content: 'text' }, { name: 'PostContentTextIndex' });
applyTZTransform(postSchema);

module.exports = mongoose.model('Post', postSchema);
