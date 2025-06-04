// src/pages/FeedPage.jsx

import React, { useEffect, useState, useContext, useCallback } from 'react';
import {
  Fab,
  Box,
  Paper,
  TextField,
  Button,
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Avatar,
  Typography,
  IconButton,
  Skeleton,
  Divider,
  Dialog,
  DialogContent,
} from '@mui/material';
import {
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  ChatBubbleOutline as CommentIcon,
  PhotoCamera as PhotoCameraIcon,
  ArrowUpward as ArrowUpwardIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { useDropzone } from 'react-dropzone';
import { api } from '../api';
import { toast } from 'react-toastify';
import AuthContext from '../AuthContext';

import ProfileSidebar from '../components/ProfileSidebar';
import FriendsSidebar from '../components/FriendsSidebar';

dayjs.extend(customParseFormat);

// Validation: allow empty string because image-only posts are permitted
const postSchema = yup
  .object({
    content: yup.string().nullable(),
  })
  .required();

export default function FeedPage() {
  const { user, authLoading } = useContext(AuthContext);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentsState, setCommentsState] = useState({});
  const [showScroll, setShowScroll] = useState(false);

  // New-post preview state
  const [imageFiles, setImageFiles] = useState([]); // File[]
  const [imagePreviews, setImagePreviews] = useState([]); // object URLs

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState('');

  // "See more" expansion
  const [expandedPosts, setExpandedPosts] = useState({}); // { [postId]: bool }

  // Carousel indices per post
  const [carouselIndices, setCarouselIndices] = useState({}); // { [postId]: index }

  // Dropzone for entire "new post" Paper container
  const onDrop = useCallback(
    (acceptedFiles) => {
      const total = imageFiles.length + acceptedFiles.length;
      if (total > 15) {
        toast.error('Maximum of 15 photos allowed.');
        return;
      }
      const imgs = acceptedFiles.filter((f) => f.type.startsWith('image/'));
      if (!imgs.length) return;
      const newPreviews = imgs.map((f) => URL.createObjectURL(f));
      setImageFiles((prev) => [...prev, ...imgs]);
      setImagePreviews((prev) => [...prev, ...newPreviews]);
    },
    [imageFiles]
  );
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: true,
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(postSchema),
    defaultValues: { content: '' },
  });

  // Load feed (only when user is non-null)
  useEffect(() => {
    if (authLoading) return; // wait until auth resolved
    if (!user) {
      setPosts([]);
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/posts');
        setPosts(data);
      } catch {
        toast.error('Failed to load posts');
        setPosts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, authLoading]);

  // Scroll-to-top control
  useEffect(() => {
    const onScroll = () => setShowScroll(window.pageYOffset > 300);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Create new post (text + images)
  const onPost = async ({ content }) => {
    const trimmed = content?.trim() || '';
    if (!trimmed && imageFiles.length === 0) {
      return toast.error('Please add text or at least one image.');
    }
    try {
      let res;
      if (imageFiles.length > 0) {
        const form = new FormData();
        form.append('content', trimmed);
        imageFiles.forEach((file) => form.append('images', file));
        res = await api.post('/posts', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        res = await api.post('/posts', { content: trimmed });
      }
      setPosts((prev) => [res.data, ...prev]);
      reset();
      imageFiles.forEach((f) => URL.revokeObjectURL(f));
      setImageFiles([]);
      setImagePreviews([]);
      toast.success('Posted!');
    } catch {
      toast.error('Could not create post');
    }
  };

  // Like/unlike a post
  const handleLike = async (postId) => {
    const p = posts.find((x) => x._id === postId);
    if (!p) return;
    try {
      if (p.liked) {
        await api.delete(`/posts/${postId}/like`);
        setPosts((ps) =>
          ps.map((x) =>
            x._id === postId
              ? { ...x, liked: false, likeCount: x.likeCount - 1 }
              : x
          )
        );
      } else {
        await api.post(`/posts/${postId}/like`);
        setPosts((ps) =>
          ps.map((x) =>
            x._id === postId
              ? { ...x, liked: true, likeCount: x.likeCount + 1 }
              : x
          )
        );
      }
    } catch {
      toast.error('Could not update like');
    }
  };

  // Toggle & load comments for a post
  const toggleComments = (postId) => {
    setCommentsState((s) => {
      const cs = s[postId] || { open: false, comments: [], input: '', parentComment: null };
      const open = !cs.open;
      if (open && !cs.comments.length) {
        api
          .get(`/comments/post/${postId}`)
          .then((res) =>
            setCommentsState((prev) => ({
              ...prev,
              [postId]: { ...cs, open, comments: res.data },
            }))
          )
          .catch(() => toast.error('Failed to load comments'));
      }
      return { ...s, [postId]: { ...cs, open } };
    });
  };
  const handleCommentChange = (postId, value) =>
    setCommentsState((s) => ({
      ...s,
      [postId]: { ...(s[postId] || {}), input: value },
    }));
  const handleCommentSubmit = async (e, postId) => {
    e.preventDefault();
    const cs = commentsState[postId];
    if (!cs.input.trim()) return;
    try {
      const { data: newC } = await api.post('/comments', {
        postId,
        content: cs.input.trim(),
        parentComment: cs.parentComment || null,
      });
      setCommentsState((prev) => ({
        ...prev,
        [postId]: {
          ...cs,
          comments: [...cs.comments, newC],
          input: '',
        },
      }));
      setPosts((ps) =>
        ps.map((x) =>
          x._id === postId
            ? { ...x, commentCount: x.commentCount + 1 }
            : x
        )
      );
      toast.success('Comment added');
    } catch {
      toast.error('Could not add comment');
    }
  };

  // Truncate text and "See more"
  const TRUNCATE_LENGTH = 200;
  const isTruncated = (text) => text.length > TRUNCATE_LENGTH;
  const displayText = (post) => {
    const full = post.content || '';
    if (expandedPosts[post._id] || !isTruncated(full)) return full;
    return full.slice(0, TRUNCATE_LENGTH) + '…';
  };
  const toggleExpand = (postId) => {
    setExpandedPosts((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  // Date formatting
  const formatDate = (raw) => {
    let d = dayjs(raw, 'DD-MM-YYYY HH:mm:ss', true);
    if (!d.isValid()) d = dayjs(raw);
    return d.isValid() ? d.format('MMM D, YYYY h:mm A') : 'Invalid date';
  };

  // Clean up previews on unmount
  useEffect(() => {
    return () => {
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);

  // If auth still loading, render nothing here
  if (authLoading) return null;
  // If not logged in, you might redirect or simply show an empty feed placeholder
  if (!user) {
    return (
      <Typography variant="h6" sx={{ p: 2, textAlign: 'center' }}>
        Please log in to see the feed.
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '2fr 4fr 2fr' },
        gap: 2,
        width: '100%',
        px: { xs: 1, sm: 2, md: 3, lg: 4 },
      }}
    >
      {/* Left Sidebar */}
      <Box
        sx={{
          display: { xs: 'none', md: 'block' },
          // Push the sidebar to stick top
          position: 'sticky',
          top: 80,
          alignSelf: 'start',
        }}
      >
        <ProfileSidebar />
      </Box>

      {/* Main Feed */}
      <Box
        sx={{
          mx: 'auto',
          width: '100%',
          maxWidth: { xs: '100%', sm: 600, md: '100%' },
        }}
      >
        {/* New Post Paper (dropzone covers entire area) */}
        <Paper
          sx={{
            p: 2,
            mb: 4,
            position: 'relative',
            cursor: 'pointer',
            backgroundColor: 'background.paper',
          }}
          {...getRootProps()}
        >
          <input {...getInputProps()} />
          <form onSubmit={handleSubmit(onPost)}>
            {/* Text area */}
            <Controller
              name="content"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  placeholder="What's on your mind?"
                  multiline
                  rows={3}
                  fullWidth
                  error={!!errors.content}
                  helperText={errors.content?.message}
                  sx={{ pr: 6, minHeight: 80, maxHeight: 200, resize: 'vertical', overflow: 'auto' }}
                />
              )}
            />

            {/* Character counter (0/2000 style) */}
            <Box
              sx={{
                position: 'absolute',
                top: 16,
                right: 16,
                fontSize: '0.75rem',
                color:
                  (control._formValues.content || '').length > 2000
                    ? 'error.main'
                    : 'text.secondary',
                animation:
                  (control._formValues.content || '').length > 2000
                    ? 'shake 0.3s'
                    : 'none',
              }}
            >
              {(control._formValues.content || '').length}/2000
            </Box>

            {/* Image Previews: show up to 5 thumbnails */}
            {imagePreviews.length > 0 && (
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 1,
                  mt: 1,
                }}
              >
                {imagePreviews.slice(0, 4).map((src, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      position: 'relative',
                      width: 80,
                      height: 80,
                      borderRadius: 1,
                      overflow: 'hidden',
                      bgcolor: 'grey.800',
                    }}
                  >
                    <Box
                      component="img"
                      src={src}
                      alt={`preview-${idx}`}
                      sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => {
                        setImageFiles((files) => files.filter((_, i) => i !== idx));
                        setImagePreviews((prev) => prev.filter((_, i) => i !== idx));
                      }}
                      sx={{
                        position: 'absolute',
                        top: 2,
                        right: 2,
                        bgcolor: 'rgba(0,0,0,0.6)',
                        '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
                      }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}

                {imagePreviews.length > 5 && (
                  <Box
                    sx={{
                      position: 'relative',
                      width: 80,
                      height: 80,
                      borderRadius: 1,
                      overflow: 'hidden',
                      bgcolor: 'grey.800',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold',
                    }}
                  >
                    +{imagePreviews.length - 4}
                  </Box>
                )}

                {imagePreviews.length === 5 && (
                  <Box
                    sx={{
                      position: 'relative',
                      width: 80,
                      height: 80,
                      borderRadius: 1,
                      overflow: 'hidden',
                      bgcolor: 'grey.800',
                    }}
                  >
                    <Box
                      component="img"
                      src={imagePreviews[4]}
                      alt="preview-4"
                      sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => {
                        setImageFiles((files) => files.filter((_, i) => i !== 4));
                        setImagePreviews((prev) => prev.filter((_, i) => i !== 4));
                      }}
                      sx={{
                        position: 'absolute',
                        top: 2,
                        right: 2,
                        bgcolor: 'rgba(0,0,0,0.6)',
                        '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
                      }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                )}
              </Box>
            )}

            {/* Bottom bar: Camera icon & Post button */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mt: 1,
              }}
            >
              <IconButton size="large">
                <PhotoCameraIcon />
              </IconButton>
              {isDragActive && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    bgcolor: 'rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px dashed',
                    borderColor: 'primary.main',
                  }}
                >
                  <Typography>Drop images here</Typography>
                </Box>
              )}

              <Button type="submit" variant="contained" disabled={isSubmitting}>
                {isSubmitting ? 'Posting…' : 'Post'}
              </Button>
            </Box>
          </form>
        </Paper>

        {/* Feed Posts */}
        {loading
          ? [0, 1, 2].map((i) => (
            <Card sx={{ mb: 2 }} key={i}>
              <Skeleton variant="rectangular" height={200} />
            </Card>
          ))
          : posts.map((post) => {
            const cs = commentsState[post._id] || {
              open: false,
              comments: [],
              input: '',
              parentComment: null,
            };
            const images = post.imageUrls || [];
            const idx = carouselIndices[post._id] || 0;

            const goPrev = () => {
              setCarouselIndices((prev) => ({
                ...prev,
                [post._id]: Math.max(idx - 1, 0),
              }));
            };
            const goNext = () => {
              setCarouselIndices((prev) => ({
                ...prev,
                [post._id]: Math.min(idx + 1, images.length - 1),
              }));
            };

            return (
              <Card sx={{ mb: 2 }} key={post._id}>
                <CardHeader
                  avatar={
                    <RouterLink
                      to={`/profile/${post.author._id}`}
                      style={{ textDecoration: 'none' }}
                    >
                      <Avatar src={post.author.avatarUrl} />
                    </RouterLink>
                  }
                  title={
                    <RouterLink
                      to={`/profile/${post.author._id}`}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      <Typography variant="subtitle1" fontWeight="bold">
                        {post.author.firstName} {post.author.lastName}
                      </Typography>
                    </RouterLink>
                  }
                  subheader={formatDate(post.createdAt)}
                  titleTypographyProps={{ align: 'left' }}
                  subheaderTypographyProps={{ align: 'left' }}
                  sx={{ px: 2, pt: 2, pb: 1 }}
                />

                {/* Carousel for multiple images */}
                {images.length > 0 && (
                  <Box
                    sx={{
                      position: 'relative',
                      width: '100%',
                      bgcolor: 'black',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      component="img"
                      src={images[idx]}
                      alt={`img-${idx}`}
                      sx={{
                        width: '100%',
                        height: 'auto',
                        objectFit: 'contain',
                        maxHeight: 400,
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        setLightboxSrc(images[idx]);
                        setLightboxOpen(true);
                      }}
                    />
                    {idx > 0 && (
                      <IconButton
                        size="large"
                        onClick={goPrev}
                        sx={{
                          position: 'absolute',
                          left: 8,
                          color: 'white',
                          bgcolor: 'rgba(0,0,0,0.4)',
                          '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' },
                        }}
                      >
                        <ChevronLeftIcon />
                      </IconButton>
                    )}
                    {idx < images.length - 1 && (
                      <IconButton
                        size="large"
                        onClick={goNext}
                        sx={{
                          position: 'absolute',
                          right: 8,
                          color: 'white',
                          bgcolor: 'rgba(0,0,0,0.4)',
                          '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' },
                        }}
                      >
                        <ChevronRightIcon />
                      </IconButton>
                    )}
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 8,
                        right: 8,
                        bgcolor: 'rgba(0,0,0,0.6)',
                        color: 'white',
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        fontSize: '0.75rem',
                      }}
                    >
                      {idx + 1}/{images.length}
                    </Box>
                  </Box>
                )}

                {/* Text content with "See more" */}
                <CardContent sx={{ textAlign: 'left', px: 2 }}>
                  <Typography>
                    {displayText(post)}
                    {isTruncated(post.content || '') && (
                      <Button
                        size="small"
                        onClick={() => toggleExpand(post._id)}
                        sx={{ ml: 1, textTransform: 'none' }}
                      >
                        {expandedPosts[post._id] ? 'See less' : 'See more'}
                      </Button>
                    )}
                  </Typography>
                </CardContent>

                <CardActions disableSpacing sx={{ px: 2 }}>
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
                  <Typography variant="body2">{post.commentCount}</Typography>
                </CardActions>

                {/* Comments section */}
                {cs.open && (
                  <Box sx={{ px: 2, pb: 2 }}>
                    <Divider sx={{ mb: 2 }} />
                    <Box
                      sx={{
                        maxHeight: 3 * 60,
                        overflowY: 'auto',
                        pr: 1,
                      }}
                    >
                      {cs.comments.map((c, idx2) => (
                        <Box
                          key={c._id}
                          sx={{ mb: 2, position: 'relative' }}
                        >
                          <Avatar
                            src={c.author.avatarUrl}
                            sx={{
                              width: 32,
                              height: 32,
                              position: 'absolute',
                              top: 0,
                              left: 0,
                            }}
                          />
                          <Box sx={{ ml: 5, pl: 1 }}>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'baseline',
                              }}
                            >
                              <RouterLink
                                to={`/profile/${c.author._id}`}
                                style={{
                                  textDecoration: 'none',
                                  color: 'inherit',
                                }}
                              >
                                <Typography
                                  variant="subtitle2"
                                  fontWeight={500}
                                >
                                  {c.author.firstName}{' '}
                                  {c.author.lastName}
                                </Typography>
                              </RouterLink>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ ml: 1, fontSize: '0.7rem' }}
                              >
                                {formatDate(c.createdAt)}
                              </Typography>
                            </Box>
                            <Typography
                              variant="body2"
                              sx={{
                                mt: 0.5,
                                textAlign: 'left',
                              }}
                            >
                              {c.content}
                            </Typography>
                            {/* Comment Like/Unlike and Replies (if you add UI here) */}
                          </Box>
                          {idx2 < cs.comments.length - 1 && (
                            <Divider sx={{ mt: 3 }} />
                          )}
                        </Box>
                      ))}
                    </Box>
                    {/* New comment form */}
                    <Box
                      component="form"
                      onSubmit={(e) =>
                        handleCommentSubmit(e, post._id)
                      }
                      sx={{ display: 'flex', gap: 1, mt: 1 }}
                    >
                      <TextField
                        placeholder="Write a comment..."
                        variant="outlined"
                        size="small"
                        fullWidth
                        value={cs.input}
                        onChange={(e) =>
                          handleCommentChange(
                            post._id,
                            e.target.value
                          )
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

        {showScroll && (
          <Fab
            color="primary"
            size="small"
            onClick={() =>
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }
            sx={{
              position: 'fixed',
              bottom: 16,
              right: 16,
              zIndex: (theme) => theme.zIndex.tooltip,
            }}
          >
            <ArrowUpwardIcon />
          </Fab>
        )}
      </Box>

      {/* Right Sidebar */}
      <Box
        sx={{
          display: { xs: 'none', md: 'block' },
          position: 'sticky',
          top: 80,
          alignSelf: 'start',
        }}
      >
        <FriendsSidebar />
      </Box>

      {/* Lightbox Dialog */}
      <Dialog
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        maxWidth="xl"
      >
        <DialogContent sx={{ p: 0, bgcolor: 'black' }}>
          <Box
            component="img"
            src={lightboxSrc}
            alt="full"
            sx={{ width: '100%', height: 'auto', objectFit: 'contain' }}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
}
