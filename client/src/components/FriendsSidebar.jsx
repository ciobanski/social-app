// src/components/FriendsSidebar.jsx

import React from 'react';
import {
  Box,
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Skeleton,
} from '@mui/material';

// A short fade‐in keyframe for list items
const fadeInKeyframes = {
  '@keyframes fadeIn': {
    '0%': { opacity: 0, transform: 'translateY(10px)' },
    '100%': { opacity: 1, transform: 'translateY(0)' },
  },
};

// Hard‐coded “friends” list for demo
const fakeFriends = [
  { id: 1, name: 'Alice Wonderland', avatar: '', isOnline: true },
  { id: 2, name: 'Bob Builder', avatar: '', isOnline: false },
  { id: 3, name: 'Charlie Chaplin', avatar: '', isOnline: true },
  { id: 4, name: 'Diana Prince', avatar: '', isOnline: true },
  { id: 5, name: 'Eve Polastri', avatar: '', isOnline: false },
  { id: 6, name: 'Frank Sinatra', avatar: '', isOnline: true },
  { id: 7, name: 'Grace Hopper', avatar: '', isOnline: true },
  { id: 8, name: 'Hank Scorpio', avatar: '', isOnline: false },
];

export default function FriendsSidebar() {
  // For demo we skip any real API; just show the fake list
  const loading = false; // toggle to true if you want skeleton placeholders

  return (
    <Box
      sx={{
        p: 2,
        width: '100%',
        // Take full viewport height minus top bar; adjust top offset as needed
        height: 'calc(100vh - 80px)',
        overflowY: 'auto',
        ...fadeInKeyframes,
      }}
    >
      <Typography variant="h6" sx={{ mb: 1 }}>
        Friends
      </Typography>

      {loading ? (
        // Skeleton placeholders while loading
        Array.from({ length: 5 }).map((_, i) => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Skeleton variant="circular" width={40} height={40} />
            <Skeleton variant="text" width={120} sx={{ ml: 1 }} />
          </Box>
        ))
      ) : (
        <List>
          {fakeFriends.map((f, index) => (
            <ListItem
              key={f.id}
              disableGutters
              sx={{
                p: 1,
                borderRadius: 1,
                mb: 0.5,
                cursor: 'pointer',
                animation: 'fadeIn 0.5s ease-out',
                animationDelay: `${index * 0.05}s`,
                animationFillMode: 'both',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <ListItemAvatar>
                <Avatar>
                  {f.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={f.name}
                secondary={
                  <Box
                    component="span"
                    sx={{
                      fontSize: '0.75rem',
                      color: f.isOnline ? 'success.main' : 'text.secondary',
                    }}
                  >
                    {f.isOnline ? 'Online' : 'Offline'}
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}
