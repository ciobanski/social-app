// server/routes/likes.js

const express = require('express');
const Like = require('../models/Like');
const Post = require('../models/Post');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/posts/:id/like
 * - Create a Like
 * - Create a Notification for the post’s author (if it isn’t you)
 * - (Optional) Emit it over Socket.IO in real time
 */
router.post('/posts/:id/like', auth, async (req, res) => {
  try {
    const postId = req.params.id;

    // 1) Make sure the post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // 2) Save the like (will error if duplicate)
    const like = await Like.create({
      user: req.user._id,
      post: postId
    });

    // 3) Notify the author (if you’re not the author)
    //    — **Make sure this matches your Post schema** (e.g. use post.user if your field is called “user”)
    const authorId = post.author?.toString() ?? post.user.toString();
    if (authorId !== req.user._id.toString()) {
      const note = await Notification.create({
        user: authorId,      // who receives the notification
        type: 'like',
        entity: {
          post: postId,
          from: req.user._id  // who liked it
        }
      });

      // 4) (Optional) real‐time push
      const io = req.app.get('io');
      if (io) {
        io.to(authorId).emit('notification', note);
      }
    }

    return res.status(201).json({ message: 'Post liked', like });
  } catch (err) {
    // 11000 = duplicate key (already liked)
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Already liked' });
    }
    console.error('POST /api/posts/:id/like error:', err);
    return res.status(500).json({ message: err.message });
  }
});

/**
 * DELETE /api/posts/:id/like
 * Remove your like from a post
 */
router.delete('/posts/:id/like', auth, async (req, res) => {
  try {
    const postId = req.params.id;
    const deleted = await Like.findOneAndDelete({
      user: req.user._id,
      post: postId
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Post not liked yet' });
    }
    return res.json({ message: 'Post unliked' });
  } catch (err) {
    console.error('DELETE /api/posts/:id/like error:', err);
    return res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/posts/:id/likes
 * Return the total number of likes on a post
 */
router.get('/posts/:id/likes', async (req, res) => {
  try {
    const count = await Like.countDocuments({ post: req.params.id });
    return res.json({ count });
  } catch (err) {
    console.error('GET /api/posts/:id/likes error:', err);
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;
