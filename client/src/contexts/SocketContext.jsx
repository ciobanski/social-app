// src/contexts/SocketContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import AuthContext from '../AuthContext';

// Strip off any trailing `/api` so we hit the bare socket endpoint
const SOCKET_URL = import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '');

const SocketContext = createContext({
  socket: null,
  onlineUsers: {},
});

export function SocketProvider({ children }) {
  const { user } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState({});

  useEffect(() => {
    let s;

    if (user) {
      // Grab JWT if you use one for socket auth
      const token = localStorage.getItem('authToken');

      s = io(SOCKET_URL, {
        autoConnect: false,
        transports: ['websocket'],
        withCredentials: true,
        auth: token ? { token } : undefined,
      });

      // presence/update handlers, etc.
      s.on('connect', () => console.log('🔌 Socket connected:', s.id));
      s.on('presence', ({ userId, isOnline }) => {
        setOnlineUsers(prev => ({ ...prev, [userId]: isOnline }));
      });
      s.on('disconnect', reason => {
        console.log('🔌 Socket disconnected:', reason);
      });

      // finally open it
      s.connect();
      setSocket(s);
    }

    // cleanup on unmount or when `user` changes (e.g. logout)
    return () => {
      if (s) {
        s.disconnect();
        setSocket(null);
        setOnlineUsers({});
      }
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
