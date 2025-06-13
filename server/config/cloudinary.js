// server/config/cloudinary.js
require('dotenv').config();
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Common Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

// Storage for user avatars (images only)
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'avatars',
    resource_type: 'image',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    transformation: [{ width: 300, height: 300, crop: 'limit' }],
  },
});

// Storage for post media (images & videos)
const postStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'posts',
    resource_type: 'auto',  // auto-detect images vs videos
    allowed_formats: [
      // images
      'jpg', 'jpeg', 'png', 'gif', 'webp',
      // videos
      'mp4', 'webm', 'mov', 'avi', 'mkv'
    ],
    transformation: [{ crop: 'limit', width: 1280, height: 720 }],
  },
});

module.exports = {
  cloudinary,
  avatarStorage,
  postStorage
};
