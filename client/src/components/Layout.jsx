// src/components/Layout.jsx
import React from 'react';
import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { ToastContainer } from 'react-toastify';

export default function Layout() {
  return (
    <Box>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        pauseOnHover
        draggable
        theme="colored"
      />
      <Navbar />
      <Box component="main" sx={{ mt: 2, p: 2 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
