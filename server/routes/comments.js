// server/routes/comments.js

const express = require('express');
const auth = require('../middleware/auth');
const Comment = require('../models/Comment');
const CommentLike = require('../models/CommentLike');
const Post = require('../models/Post');
const Notification = require('../models/Notification');

const router = express.Router();

/**
 * POST /api/comments
 * Create a new comment or reply
 */
router.post('/', auth, async (req, res) => {
  try {
    const { postId, content, parentComment } = req.body;

    // 1) Verify the post exists
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    // 2) Create the comment
    const comment = await Comment.create({
      post: postId,
      author: req.user._id,
      content,
      parentComment: parentComment || null
    });
    await comment.populate('author', 'firstName lastName avatarUrl');

    // 3) Send notification to the post’s author (top-level only)
    if (!parentComment && post.author.toString() !== req.user._id.toString()) {
      const note = await Notification.create({
        user: post.author,
        type: 'comment',
        entity: {
          from: req.user._id,
          post: postId,
          comment: comment._id
        }
      });
      // real-time push
      const io = req.app.get('io');
      if (io) io.to(post.author.toString()).emit('notification', note);
    }

    // 4) If this is a reply, notify the parent comment’s author
    if (parentComment) {
      const parent = await Comment.findById(parentComment);
      if (parent && parent.author.toString() !== req.user._id.toString()) {
        const replyNote = await Notification.create({
          user: parent.author,
          type: 'comment_reply',
          entity: {
            from: req.user._id,
            post: postId,
            comment: comment._id,
            parentComment: parent._id
          }
        });
        const io = req.app.get('io');
        if (io) io.to(parent.author.toString()).emit('notification', replyNote);
      }
    }

    return res.status(201).json(comment);
  } catch (err) {
    console.error('Create comment error:', err);
    return res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/comments/post/:postId
 * Fetch all comments for a post (flat list)
 */
router.get('/post/:postId', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const comments = await Comment.find({ post: post._id })
      .sort({ createdAt: 1 })
      .populate('author', 'firstName lastName avatarUrl');

    // annotate each with likeCount + liked
    const ids = comments.map(c => c._id);
    const agg = await CommentLike.aggregate([
      { $match: { comment: { $in: ids } } },
      { $group: { _id: '$comment', count: { $sum: 1 } } }
    ]);
    const countMap = {};
    agg.forEach(x => { countMap[x._id.toString()] = x.count; });

    const userLikes = await CommentLike.find({
      comment: { $in: ids },
      user: req.user._id
    }).select('comment');
    const likedSet = new Set(userLikes.map(x => x.comment.toString()));

    const out = comments.map(c => ({
      ...c.toObject(),
      likeCount: countMap[c._id.toString()] || 0,
      liked: likedSet.has(c._id.toString())
    }));

    res.json(out);
  } catch (err) {
    console.error('Get comments error:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/comments/:id/like
 * Like a comment and notify its author
 */
router.post('/:id/like', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    // create the like
    await CommentLike.create({
      comment: comment._id,
      user: req.user._id
    });

    // notify the comment’s author
    if (comment.author.toString() !== req.user._id.toString()) {
      const note = await Notification.create({
        user: comment.author,
        type: 'comment_like',
        entity: {
          from: req.user._id,
          comment: comment._id,
          post: comment.post
        }
      });
      const io = req.app.get('io');
      if (io) io.to(comment.author.toString()).emit('notification', note);
    }

    res.json({ message: 'Comment liked' });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Already liked' });
    }
    console.error('Like comment error:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * DELETE /api/comments/:id/like
 * Unlike a comment
 */
router.delete('/:id/like', auth, async (req, res) => {
  try {
    const removed = await CommentLike.findOneAndDelete({
      comment: req.params.id,
      user: req.user._id
    });
    if (!removed) return res.status(400).json({ message: 'Not previously liked' });
    res.json({ message: 'Comment unliked' });
  } catch (err) {
    console.error('Unlike comment error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
