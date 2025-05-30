// server/config/cloudinary.js
require('dotenv').config();
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// common SDK config
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET
});

// storage for user avatars
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'avatars',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    transformation: [{ width: 300, height: 300, crop: 'limit' }]
  }
});

// storage for post images
const postStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'posts',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ crop: 'limit', width: 1280, height: 720 }]
  }
});

module.exports = {
  cloudinary,
  avatarStorage,
  postStorage
};
