// src/Theme.jsx
import React from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#2563eb' },
    secondary: { main: '#16a34a' }
  },
  typography: {
    fontFamily: 'Avenir, sans-serif'
  },
  shape: {
    borderRadius: 12
  }
});

export default function AppTheme({ children }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
