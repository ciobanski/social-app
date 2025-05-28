// src/contexts/SocketContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();
export const useSocket = () => useContext(SocketContext);

export default function SocketProvider({ children, token }) {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState({});

  useEffect(() => {
    if (!token) return;

    const socketInstance = io(
      import.meta.env.VITE_API_URL.replace(/\/api\/?$/, ''),
      {
        auth: { token },
        transports: ['websocket'],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      }
    );

    socketInstance.on('connect', () =>
      console.log('🔌 Socket connected', socketInstance.id)
    );

    socketInstance.on('presence', ({ userId, isOnline }) => {
      setOnlineUsers(prev => ({ ...prev, [userId]: isOnline }));
    });

    socketInstance.on('disconnect', reason =>
      console.log('🔌 Socket disconnected:', reason)
    );

    setSocket(socketInstance);
    return () => {
      socketInstance.disconnect();
    };
  }, [token]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
}
