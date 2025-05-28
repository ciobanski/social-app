// src/pages/FeedPage.jsx
import React, { useEffect, useState, useContext } from 'react';
import {
  Container,
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Avatar,
  Typography,
  IconButton,
  TextField,
  Button,
  Skeleton,
  Box,
  Divider
} from '@mui/material';
import {
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  ChatBubbleOutline as CommentIcon
} from '@mui/icons-material';
import { api } from '../api';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { AuthContext } from '../AuthContext';

dayjs.extend(customParseFormat);

export default function FeedPage() {
  const { user } = useContext(AuthContext);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentsState, setCommentsState] = useState({});

  useEffect(() => {
    const loadPosts = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/posts');
        setPosts(data);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load posts');
      } finally {
        setLoading(false);
      }
    };
    loadPosts();
  }, [user]);

  const updatePost = (postId, fields) => {
    setPosts((prev) =>
      prev.map((p) => (p._id === postId ? { ...p, ...fields } : p))
    );
  };

  const handleLike = async (postId) => {
    const post = posts.find((p) => p._id === postId);
    if (!post) return;
    try {
      if (post.liked) {
        await api.delete(`/posts/${postId}/like`);
        updatePost(postId, {
          liked: false,
          likeCount: post.likeCount - 1
        });
      } else {
        await api.post(`/posts/${postId}/like`);
        updatePost(postId, {
          liked: true,
          likeCount: post.likeCount + 1
        });
      }
    } catch {
      toast.error('Could not update like');
    }
  };

  const toggleComments = (postId) => {
    setCommentsState((s) => {
      const cs = s[postId] || {
        open: false,
        comments: [],
        input: ''
      };
      const open = !cs.open;

      if (open && cs.comments.length === 0) {
        api
          .get(`/comments/post/${postId}`)
          .then((res) =>
            setCommentsState((s2) => ({
              ...s2,
              [postId]: {
                ...cs,
                open,
                comments: res.data
              }
            }))
          )
          .catch(() => toast.error('Failed to load comments'));
      }

      return { ...s, [postId]: { ...cs, open } };
    });
  };

  const handleCommentChange = (postId, value) => {
    setCommentsState((s) => ({
      ...s,
      [postId]: { ...(s[postId] || {}), input: value }
    }));
  };

  const handleCommentSubmit = async (e, postId) => {
    e.preventDefault();
    const cs = commentsState[postId];
    if (!cs?.input.trim()) return;
    try {
      const { data: newComment } = await api.post('/comments', {
        postId,
        content: cs.input.trim(),
        parentComment: null
      });

      // Add the new comment (with populated author) and bump count
      setCommentsState((s) => ({
        ...s,
        [postId]: {
          ...cs,
          comments: [...cs.comments, newComment],
          input: ''
        }
      }));
      updatePost(postId, {
        commentCount: posts.find((p) => p._id === postId).commentCount + 1
      });
      toast.success('Comment added');
    } catch {
      toast.error('Could not add comment');
    }
  };

  const formatDate = (raw) => {
    const d = dayjs(raw, 'DD-MM-YYYY HH:mm:ss');
    return d.isValid() ? d.format('MMM D, YYYY h:mm A') : 'Unknown date';
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
      {loading
        ? [0, 1, 2].map((i) => (
          <Card sx={{ mb: 2 }} key={i}>
            <CardHeader
              avatar={<Skeleton variant="circular" width={40} height={40} />}
              title={<Skeleton width="40%" />}
              subheader={<Skeleton width="30%" />}
            />
            <CardContent>
              <Skeleton variant="rectangular" width="100%" height={80} />
            </CardContent>
          </Card>
        ))
        : posts.map((post) => {
          const cs = commentsState[post._id] || {
            open: false,
            comments: [],
            input: ''
          };

          return (
            <Card sx={{ mb: 2 }} key={post._id}>
              <CardHeader
                avatar={<Avatar src={post.author?.avatarUrl} />}
                title={`${post.author?.firstName} ${post.author?.lastName}`}
                subheader={formatDate(post.createdAt)}
              />
              <CardContent>
                <Typography variant="body1">{post.content}</Typography>
              </CardContent>
              <CardActions disableSpacing>
                <IconButton onClick={() => handleLike(post._id)}>
                  {post.liked ? (
                    <FavoriteIcon color="error" />
                  ) : (
                    <FavoriteBorderIcon />
                  )}
                </IconButton>
                <Typography variant="body2" sx={{ mr: 2 }}>
                  {post.likeCount}
                </Typography>
                <IconButton onClick={() => toggleComments(post._id)}>
                  <CommentIcon />
                </IconButton>
                <Typography variant="body2">
                  {post.commentCount}
                </Typography>
              </CardActions>

              {cs.open && (
                <Box sx={{ px: 2, pb: 2 }}>
                  <Divider sx={{ mb: 2 }} />
                  {cs.comments.map((c) => (
                    <Box key={c._id} sx={{ mb: 1 }}>
                      <Typography variant="subtitle2">
                        {c.author.firstName} {c.author.lastName}
                      </Typography>
                      <Typography variant="body2" sx={{ ml: 1 }}>
                        {c.content}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ ml: 1, color: 'text.secondary' }}
                      >
                        {formatDate(c.createdAt)}
                      </Typography>
                    </Box>
                  ))}
                  <Box
                    component="form"
                    onSubmit={(e) => handleCommentSubmit(e, post._id)}
                    sx={{ display: 'flex', gap: 1, mt: 1 }}
                  >
                    <TextField
                      placeholder="Write a comment..."
                      variant="outlined"
                      size="small"
                      fullWidth
                      value={cs.input}
                      onChange={(e) =>
                        handleCommentChange(post._id, e.target.value)
                      }
                    />
                    <Button type="submit" variant="contained">
                      Post
                    </Button>
                  </Box>
                </Box>
              )}
            </Card>
          );
        })}
    </Container>
  );
}
