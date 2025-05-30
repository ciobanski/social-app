// src/components/Layout.jsx
import React from 'react';
import { Box, Toolbar, IconButton } from '@mui/material';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import { Outlet } from 'react-router-dom';
import Header from './Header';

export default function Layout() {
  return (
    <>
      {/* Full-width fixed header */}
      <Header />

      {/* Spacer to sit below AppBar */}
      <Toolbar variant="dense" />

      {/* Main content area */}
      <Box
        component="main"
        sx={{
          width: '100%',
          pt: 2,
          px: 2,
          pb: 4,
          overflowX: 'hidden'
        }}
      >
        <Outlet />

        {/* Chat bubble on small screens, bottom-left */}
        <Box
          sx={{
            position: 'fixed',
            bottom: 16,
            left: 16,
            display: { xs: 'block', md: 'none' }
          }}
        >
          <IconButton
            color="primary"
            sx={{
              bgcolor: 'background.paper',
              '&:hover': { bgcolor: 'background.paper' },
              boxShadow: 3
            }}
          >
            <ChatBubbleOutlineIcon />
          </IconButton>
        </Box>
      </Box>
    </>
  );
}
