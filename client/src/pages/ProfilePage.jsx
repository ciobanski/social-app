import React, { useEffect, useState, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import {
  Avatar,
  Box,
  Typography,
  Button,
  CircularProgress,
  Card,
  CardHeader,
  CardContent,
  CardActions,
  IconButton,
  Divider
} from '@mui/material';
import {
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  ChatBubbleOutline as CommentIcon
} from '@mui/icons-material';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { toast } from 'react-toastify';
import { AuthContext } from '../AuthContext';
import EditProfileModal from '../components/EditProfileModal';

dayjs.extend(customParseFormat);

export default function ProfilePage() {
  const { id } = useParams();
  const { user: me, reload: reloadMe } = useContext(AuthContext);

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  // fetch profile
  useEffect(() => {
    setLoadingProfile(true);
    api.get(`/users/${id}`)
      .then(res => setProfile(res.data))
      .catch(err => {
        console.error(err);
        toast.error(err.response?.status === 404
          ? 'User not found' : 'Could not load profile');
      })
      .finally(() => setLoadingProfile(false));
  }, [id]);

  // fetch their posts
  useEffect(() => {
    setLoadingPosts(true);
    api.get(`/users/${id}/posts`)
      .then(res => setPosts(res.data))
      .catch(err => {
        console.error(err);
        toast.error('Could not load user posts');
      })
      .finally(() => setLoadingPosts(false));
  }, [id]);

  const formatDate = raw => {
    let d = dayjs(raw, 'DD-MM-YYYY HH:mm:ss', true);
    if (!d.isValid()) d = dayjs(raw);
    return d.isValid() ? d.format('MMM D, YYYY h:mm A') : 'Invalid date';
  };

  const isMe = me?.id === id;

  if (loadingProfile) {
    return (
      <Box textAlign="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }
  if (!profile) {
    return (
      <Typography color="error" align="center" mt={4}>
        User not found.
      </Typography>
    );
  }

  return (
    <Box>
      {/* ── Header ───────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, gap: 2 }}>
        <Avatar src={profile.avatarUrl} sx={{ width: 80, height: 80 }} />
        <Box>
          <Typography variant="h5" fontWeight="bold">
            {profile.firstName} {profile.lastName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {profile.country || '—'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {profile.birthday
              ? dayjs(profile.birthday).format('MMMM D, YYYY')
              : ''}
          </Typography>
          {isMe && (
            <Button
              variant="outlined"
              size="small"
              sx={{ mt: 1 }}
              onClick={() => setEditOpen(true)}
            >
              Edit Profile
            </Button>
          )}
        </Box>
      </Box>

      {/* ── Their Posts ─────────────────────── */}
      <Typography variant="h6" gutterBottom>Posts</Typography>
      {loadingPosts ? (
        <Box textAlign="center" mt={2}><CircularProgress size={24} /></Box>
      ) : posts.length === 0 ? (
        <Typography color="text.secondary">No posts yet.</Typography>
      ) : (
        posts.map(post => (
          <Card sx={{ mb: 2 }} key={post._id}>
            <CardHeader
              avatar={<Avatar src={post.author.avatarUrl} />}
              title={`${post.author.firstName} ${post.author.lastName}`}
              subheader={formatDate(post.createdAt)}
              titleTypographyProps={{ align: 'left' }}
              subheaderTypographyProps={{ align: 'left' }}
              sx={{ px: 2, pt: 2, pb: 1 }}
            />
            <CardContent sx={{ textAlign: 'left', px: 2 }}>
              <Typography>{post.content}</Typography>
            </CardContent>
            <CardActions disableSpacing sx={{ px: 2 }}>
              <IconButton>
                {post.liked ? <FavoriteIcon color="error" /> : <FavoriteBorderIcon />}
              </IconButton>
              <Typography variant="body2" sx={{ mr: 2 }}>
                {post.likeCount}
              </Typography>
              <IconButton><CommentIcon /></IconButton>
              <Typography variant="body2">{post.commentCount}</Typography>
            </CardActions>
          </Card>
        ))
      )}

      {/* ── Edit Profile Modal ─────────────── */}
      <EditProfileModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        profile={profile}
        setProfile={setProfile}
        reloadMe={reloadMe}
      />
    </Box>
  );
}
