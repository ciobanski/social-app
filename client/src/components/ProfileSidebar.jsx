// src/components/ProfileSidebar.jsx

import React, { useContext } from 'react';
import {
  Box,
  Paper,
  Avatar,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Person as PersonIcon,
  Settings as SettingsIcon,
  Bookmark as BookmarkIcon,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import AuthContext from '../AuthContext';

export default function ProfileSidebar() {
  const { user } = useContext(AuthContext);

  // Hard‐coded links for demo purposes:
  const links = [
    { label: 'View Profile', icon: <PersonIcon />, to: `/profile/${user.id}` },
    { label: 'Settings', icon: <SettingsIcon />, to: '/settings' },
    { label: 'Saved Posts', icon: <BookmarkIcon />, to: '/saved' },
  ];

  return (
    <Paper sx={{ p: 2, width: '100%' }}>
      <Box sx={{ textAlign: 'center', mb: 2 }}>
        <Avatar
          src={user.avatarUrl || ''}
          sx={{ width: 80, height: 80, mx: 'auto', mb: 1 }}
        />
        <Typography
          component={RouterLink}
          to={`/profile/${user.id}`}
          variant="h6"
          sx={{
            textDecoration: 'none',
            color: 'text.primary',
            '&:hover': { color: 'primary.main' },
          }}
        >
          {user.firstName} {user.lastName}
        </Typography>
      </Box>

      <Divider sx={{ mb: 1 }} />

      <List>
        {links.map((item) => (
          <ListItem
            key={item.label}
            component={RouterLink}
            to={item.to}
            disableGutters
            sx={{
              borderRadius: 1,
              mb: 0.5,
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
          >
            <ListItemIcon sx={{ color: 'text.secondary', minWidth: 36 }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{
                variant: 'body1',
                color: 'text.primary',
                sx: { fontWeight: 500 },
              }}
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}
