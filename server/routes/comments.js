// server/routes/comments.js
const express = require('express');
const authMiddleware = require('../middleware/auth');
const Comment = require('../models/Comment');
const User = require('../models/User');
const CommentLike = require('../models/CommentLike'); // ← NEW
const { canViewPost } = require('../utils/privacy'); // if you filter by privacy
const Post = require('../models/Post'); // in case you need to validate post existence

const router = express.Router();

// ── Create a new comment (top‐level or reply) ─────────────────
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { postId, content, parentComment } = req.body;
    // Optional: verify that postId exists and user can view the post
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    // if you have privacy rules, check canViewPost(req.user._id, post)

    // Create the comment
    const comment = await Comment.create({
      post: postId,
      author: req.user._id,
      content,
      parentComment: parentComment || null,
    });

    // Populate the author field so the client immediately gets user info
    await comment.populate('author', 'firstName lastName avatarUrl');

    res.status(201).json(comment);
  } catch (err) {
    console.error('Create comment error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── Get all comments (and replies) for a post ───────────────────
// Returns a flat array of comments: { _id, post, author, content, parentComment, createdAt, ... }.
// We then add likeCount and liked fields for each comment
router.get('/post/:postId', authMiddleware, async (req, res) => {
  try {
    const postId = req.params.postId;
    // Optionally verify post exists:
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    // Optionally, check canViewPost(req.user._id, post)

    // Fetch all comments for this post
    const comments = await Comment.find({ post: postId })
      .sort({ createdAt: 1 }) // oldest first
      .populate('author', 'firstName lastName avatarUrl');

    // For each comment, count likes and check if current user liked it
    const commentIds = comments.map((c) => c._id);
    // 1) Count likes per comment in bulk
    const likeCounts = await CommentLike.aggregate([
      { $match: { comment: { $in: commentIds } } },
      { $group: { _id: '$comment', count: { $sum: 1 } } },
    ]);
    const likeCountMap = {};
    likeCounts.forEach((lc) => {
      likeCountMap[lc._id.toString()] = lc.count;
    });
    // 2) Check which comments the current user liked
    const userLikes = await CommentLike.find({
      comment: { $in: commentIds },
      user: req.user._id,
    }).select('comment');
    const likedSet = new Set(userLikes.map((ul) => ul.comment.toString()));

    // Assemble response
    const out = comments.map((c) => ({
      ...c.toObject(),
      likeCount: likeCountMap[c._id.toString()] || 0,
      liked: likedSet.has(c._id.toString()),
    }));

    res.json(out);
  } catch (err) {
    console.error('Get comments error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── Like a comment ─────────────────────────────────────────────
router.post('/:id/like', authMiddleware, async (req, res) => {
  try {
    const commentId = req.params.id;
    // Verify comment exists
    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    // Create a CommentLike; we rely on the unique index to prevent duplicates
    await CommentLike.create({ comment: commentId, user: req.user._id });
    res.json({ message: 'Comment liked' });
  } catch (err) {
    if (err.code === 11000) {
      // duplicate key error = user already liked this comment
      return res.status(400).json({ message: 'Already liked' });
    }
    console.error('Like comment error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── Unlike a comment ───────────────────────────────────────────
router.delete('/:id/like', authMiddleware, async (req, res) => {
  try {
    const commentId = req.params.id;
    // Remove the CommentLike document if it exists
    const result = await CommentLike.findOneAndDelete({
      comment: commentId,
      user: req.user._id,
    });
    if (!result) {
      return res.status(400).json({ message: 'Not previously liked' });
    }
    res.json({ message: 'Comment unliked' });
  } catch (err) {
    console.error('Unlike comment error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── (Optional) Delete a comment if author/admin ─────────────────
// ... (Your existing delete‐comment logic can stay here)

module.exports = router;
