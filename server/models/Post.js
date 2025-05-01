const mongoose = require('mongoose');

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
      maxlength: 280  // like a tweet; adjust as you see fit
    },
    imageUrl: String,  // will store your S3 URL after upload
    hashtags: [String], // e.g. ['travel', 'sunset']
  },
  { timestamps: true }
);

module.exports = mongoose.model('Post', postSchema);
