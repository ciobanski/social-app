// src/pages/FeedPage.jsx
import React, {
  useEffect,
  useState,
  useContext,
  useCallback
} from 'react';
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
  DialogContent
} from '@mui/material';
import {
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  ChatBubbleOutline as CommentIcon,
  PhotoCamera as PhotoCameraIcon,
  ArrowUpward as ArrowUpwardIcon,
  Close as CloseIcon,
  ArrowBackIosNew as ArrowBackIosNewIcon,
  ArrowForwardIos as ArrowForwardIosIcon
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
import { AuthContext } from '../AuthContext';

import ProfileSidebar from '../components/ProfileSidebar';
import FriendsSidebar from '../components/FriendsSidebar';

dayjs.extend(customParseFormat);

// allow empty text or images, but not both
const postSchema = yup.object({ content: yup.string() }).required();

export default function FeedPage() {
  const { user } = useContext(AuthContext);

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentsState, setCommentsState] = useState({});
  const [showScroll, setShowScroll] = useState(false);

  // for drag/drop & multi-file upload
  const [imageFiles, setImageFiles] = useState([]);           // File[]
  const [imagePreviews, setImagePreviews] = useState([]);     // string[]

  // carousel index per post
  const [carouselIdx, setCarouselIdx] = useState({});         // { [postId]: number }

  // lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState('');

  // dropzone only on camera icon
  const onDrop = useCallback(acceptedFiles => {
    if (!acceptedFiles.length) return;
    if (imageFiles.length + acceptedFiles.length > 15) {
      return toast.error('Maximum 15 images allowed');
    }
    setImageFiles(files => [...files, ...acceptedFiles]);
    setImagePreviews(prev => [
      ...prev,
      ...acceptedFiles.map(f => URL.createObjectURL(f))
    ]);
  }, [imageFiles]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: true
  });

  // form setup
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: yupResolver(postSchema),
    defaultValues: { content: '' }
  });

  // load feed
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/posts');
        setPosts(data);
      } catch {
        toast.error('Failed to load posts');
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  // scroll-to-top control
  useEffect(() => {
    const onScroll = () => setShowScroll(window.pageYOffset > 300);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // handle new post
  const onPost = async ({ content }) => {
    if (!content.trim() && imageFiles.length === 0) {
      return toast.error('Please add text or at least one image');
    }
    try {
      let res;
      if (imageFiles.length) {
        const form = new FormData();
        form.append('content', content);
        imageFiles.forEach(f => form.append('images', f));
        res = await api.post('/posts', form, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        res = await api.post('/posts', { content });
      }
      setPosts(prev => [res.data, ...prev]);
      reset();                    // clear text
      setImageFiles([]);          // clear files
      setImagePreviews([]);       // clear previews
      toast.success('Posted!');
    } catch {
      toast.error('Could not create post');
    }
  };

  // like/unlike
  const handleLike = async postId => {
    const p = posts.find(x => x._id === postId);
    if (!p) return;
    try {
      if (p.liked) {
        await api.delete(`/posts/${postId}/like`);
        setPosts(ps =>
          ps.map(x =>
            x._id === postId
              ? { ...x, liked: false, likeCount: x.likeCount - 1 }
              : x
          )
        );
      } else {
        await api.post(`/posts/${postId}/like`);
        setPosts(ps =>
          ps.map(x =>
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

  // comments toggle & load
  const toggleComments = postId => {
    setCommentsState(s => {
      const cs = s[postId] || { open: false, comments: [], input: '' };
      const open = !cs.open;
      if (open && !cs.comments.length) {
        api
          .get(`/comments/post/${postId}`)
          .then(res =>
            setCommentsState(prev => ({
              ...prev,
              [postId]: { ...cs, open, comments: res.data }
            }))
          )
          .catch(() => toast.error('Failed to load comments'));
      }
      return { ...s, [postId]: { ...cs, open } };
    });
  };
  const handleCommentChange = (postId, v) =>
    setCommentsState(s => ({
      ...s,
      [postId]: { ...(s[postId] || {}), input: v }
    }));
  const handleCommentSubmit = async (e, postId) => {
    e.preventDefault();
    const cs = commentsState[postId];
    if (!cs.input.trim()) return;
    try {
      const { data: newC } = await api.post('/comments', {
        postId,
        content: cs.input.trim(),
        parentComment: null
      });
      setCommentsState(prev => ({
        ...prev,
        [postId]: {
          ...cs,
          comments: [...cs.comments, newC],
          input: ''
        }
      }));
      setPosts(ps =>
        ps.map(x =>
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

  // format date
  const formatDate = raw => {
    let d = dayjs(raw, 'DD-MM-YYYY HH:mm:ss', true);
    if (!d.isValid()) d = dayjs(raw);
    return d.isValid() ? d.format('MMM D, YYYY h:mm A') : 'Invalid date';
  };

  // remove a previewed image
  const handleRemoveImage = idx => {
    setImageFiles(files => files.filter((_, i) => i !== idx));
    setImagePreviews(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 2fr 1fr' },
        width: '100%',
        gap: 2
      }}
    >
      {/* Left sidebar */}
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <ProfileSidebar />
      </Box>

      {/* Main feed */}
      <Box>
        {/* Post composer */}
        <Paper sx={{ p: 2, mb: 4 }}>
          <form onSubmit={handleSubmit(onPost)}>
            {/* text input */}
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
                />
              )}
            />

            {/* previews row */}
            {imagePreviews.length > 0 && (
              <Box
                mt={1}
                mb={1}
                sx={{
                  display: 'flex',
                  gap: 1,
                  overflowX: 'auto'
                }}
              >
                {imagePreviews.map((src, idx) => (
                  <Box key={idx} sx={{ position: 'relative' }}>
                    <Box
                      component="img"
                      src={src}
                      alt={`preview ${idx}`}
                      sx={{
                        width: 80,
                        height: 80,
                        objectFit: 'cover',
                        borderRadius: 1
                      }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveImage(idx)}
                      sx={{
                        position: 'absolute',
                        top: -6,
                        right: -6,
                        bgcolor: 'background.paper'
                      }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}

            {/* bottom bar */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mt: 1
              }}
            >
              {/* only camera icon is dropzone */}
              <Box {...getRootProps()} sx={{ display: 'flex', alignItems: 'center' }}>
                <input {...getInputProps()} />
                <IconButton size="large">
                  <PhotoCameraIcon />
                </IconButton>
              </Box>

              <Button type="submit" variant="contained" disabled={isSubmitting}>
                {isSubmitting ? 'Posting…' : 'Post'}
              </Button>
            </Box>
          </form>
        </Paper>

        {/* feed */}
        {loading
          ? [0, 1, 2].map(i => (
            <Card sx={{ mb: 2 }} key={i}>
              <Skeleton variant="rectangular" height={200} />
            </Card>
          ))
          : posts.map(post => {
            const cs = commentsState[post._id] || {
              open: false,
              comments: [],
              input: ''
            };
            const imgs = post.imageUrls || [];
            const idx = carouselIdx[post._id] || 0;
            return (
              <Card sx={{ mb: 2 }} key={post._id}>
                <CardHeader
                  avatar={<Avatar src={post.author.avatarUrl} />}
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

                {/* carousel, if any */}
                {imgs.length > 0 && (
                  <Box sx={{ position: 'relative', px: 2, pb: 1 }}>
                    <Box
                      component="img"
                      src={imgs[idx]}
                      alt={`post-img-${idx}`}
                      sx={{
                        width: '100%',
                        height: 300,
                        objectFit: 'contain',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        setLightboxSrc(imgs[idx]);
                        setLightboxOpen(true);
                      }}
                    />
                    {imgs.length > 1 && (
                      <>
                        <IconButton
                          onClick={() => {
                            const prev = (idx - 1 + imgs.length) % imgs.length;
                            setCarouselIdx(ci => ({ ...ci, [post._id]: prev }));
                          }}
                          sx={{
                            position: 'absolute',
                            top: '50%',
                            left: 8,
                            transform: 'translateY(-50%)',
                            bgcolor: 'background.paper'
                          }}
                        >
                          <ArrowBackIosNewIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          onClick={() => {
                            const nxt = (idx + 1) % imgs.length;
                            setCarouselIdx(ci => ({ ...ci, [post._id]: nxt }));
                          }}
                          sx={{
                            position: 'absolute',
                            top: '50%',
                            right: 8,
                            transform: 'translateY(-50%)',
                            bgcolor: 'background.paper'
                          }}
                        >
                          <ArrowForwardIosIcon fontSize="small" />
                        </IconButton>
                      </>
                    )}
                  </Box>
                )}

                <CardContent sx={{ textAlign: 'left', px: 2 }}>
                  <Typography>{post.content}</Typography>
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
                  <Typography variant="body2">
                    {post.commentCount}
                  </Typography>
                </CardActions>

                {cs.open && (
                  <Box sx={{ px: 2, pb: 2 }}>
                    <Divider sx={{ mb: 2 }} />
                    <Box
                      sx={{
                        maxHeight: 3 * 60,
                        overflowY: 'auto',
                        pr: 1
                      }}
                    >
                      {cs.comments.map((c, idx) => (
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
                              left: 0
                            }}
                          />
                          <Box sx={{ ml: 5, pl: 1 }}>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'baseline'
                              }}
                            >
                              <RouterLink
                                to={`/profile/${c.author._id}`}
                                style={{
                                  textDecoration: 'none',
                                  color: 'inherit'
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
                              sx={{ mt: 0.5, textAlign: 'left' }}
                            >
                              {c.content}
                            </Typography>
                          </Box>
                          {idx < cs.comments.length - 1 && (
                            <Divider sx={{ mt: 3 }} />
                          )}
                        </Box>
                      ))}
                    </Box>
                    <Box
                      component="form"
                      onSubmit={e =>
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
                        onChange={e =>
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
              zIndex: theme => theme.zIndex.tooltip
            }}
          >
            <ArrowUpwardIcon />
          </Fab>
        )}
      </Box>

      {/* Right sidebar */}
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <FriendsSidebar />
      </Box>

      {/* Lightbox */}
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
            sx={{
              width: '100%',
              height: 'auto',
              objectFit: 'contain'
            }}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
}
