// src/SocketProvider.jsx

import React, { useEffect, useContext } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContext';

// If you’re using Vite and have VITE_API_URL in your .env:
const SOCKET_URL = import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '');

export default function SocketProvider({ children }) {
  const { user } = useContext(AuthContext);
  const token = localStorage.getItem('token');

  useEffect(() => {
    // Only connect once we have a logged-in user and a token
    if (!user || !token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket']
    });

    socket.on('connect', () => {
      console.log('🔌 Socket connected, id=', socket.id);
    });

    socket.on('presence', ({ userId, isOnline }) => {
      console.log(`📶 User ${userId} is now ${isOnline ? 'online' : 'offline'}`);
      // You could dispatch this to context or update your UI here
    });

    socket.on('disconnect', reason => {
      console.log('🔌 Socket disconnected:', reason);
    });

    // Clean up on unmount or user change
    return () => {
      socket.disconnect();
    };
  }, [user, token]);

  return <>{children}</>;
}
