// src/Theme.jsx
import React, { useMemo } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

export default function AppTheme({ children }) {
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: 'dark',
          primary: { main: '#2563eb' },
          secondary: { main: '#16a34a' },
          background: {
            default: '#121212',
            paper: 'rgba(30,30,30,0.8)',
          },
        },
        typography: {
          fontFamily: 'Avenir, sans-serif',
        },
        shape: {
          borderRadius: 12,
        },
      }),
    []
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
