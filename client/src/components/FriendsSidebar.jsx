// src/components/FriendsSidebar.jsx
import React, { useEffect, useState } from 'react';
import {
  Paper,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Skeleton
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { api } from '../api';
import { toast } from 'react-toastify';

export default function FriendsSidebar() {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/friends')
      .then(res => {
        // if the server returned { friends: [...] }, use that, otherwise assume the array
        const list = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data.friends)
            ? res.data.friends
            : [];
        setFriends(list);
      })
      .catch(() => toast.error('Failed to load friends'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Friends
      </Typography>

      {loading ? (
        [0, 1, 2].map(i => (
          <Skeleton key={i} variant="rectangular" height={40} sx={{ mb: 1 }} />
        ))
      ) : (
        <List dense disablePadding>
          {friends.map(f => (
            <ListItem
              key={f._id}
              component={RouterLink}
              to={`/profile/${f._id}`}
              sx={{
                textDecoration: 'none',
                color: 'inherit',
                py: 0.5
              }}
            >
              <ListItemAvatar>
                <Avatar src={f.avatarUrl} />
              </ListItemAvatar>
              <ListItemText
                primary={`${f.firstName} ${f.lastName}`}
                primaryTypographyProps={{ fontSize: '0.9rem' }}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Paper>
  );
}
