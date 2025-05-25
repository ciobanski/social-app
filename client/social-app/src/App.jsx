// src/App.jsx
import React from 'react';
import { AuthProvider } from './AuthContext';
import Routes from './Routes';

export default function App() {
  return (
    <AuthProvider>
      <Routes />
    </AuthProvider>
  );
}
