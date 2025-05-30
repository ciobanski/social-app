import React, { useContext } from 'react';
import {
  Box,
  Paper,
  Avatar,
  Typography
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { AuthContext } from '../AuthContext';

export default function ProfileSidebar() {
  const { user } = useContext(AuthContext);

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ textAlign: 'center' }}>
        <Avatar
          src={user.avatarUrl}
          sx={{ width: 64, height: 64, mx: 'auto', mb: 1 }}
        />
        <Typography
          component={RouterLink}
          to={`/profile/${user.id}`}
          variant="h6"
          sx={{
            textDecoration: 'none',
            color: 'text.primary'
          }}
        >
          {user.firstName} {user.lastName}
        </Typography>
      </Box>
    </Paper>
  );
}
