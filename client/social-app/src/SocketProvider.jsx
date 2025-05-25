// src/SocketProvider.jsx
import React, { useEffect, useContext } from 'react';
import { socket } from './socket';
import { AuthContext } from './AuthContext';

export default function SocketProvider({ children }) {
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (!user) return;

    socket.connect();

    socket.on('presence', ({ userId, isOnline }) => {
      // update your presence store
    });

    socket.on('notification', data => {
      // push into your in-app notifications state
    });

    return () => {
      socket.off('presence');
      socket.off('notification');
      socket.disconnect();
    };
  }, [user]);

  return children;
}
