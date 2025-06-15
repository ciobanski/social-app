// src/contexts/SocketContext.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import { io } from 'socket.io-client';
import AuthContext from '../AuthContext';  // ← pull in your AuthContext

// strip off the `/api` from your VITE_API_URL to get the socket endpoint
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
    // only connect once we have a logged-in user
    if (!user) return;

    // if you’re using JWTs in localStorage, grab it here:
    const token = localStorage.getItem('authToken');

    const s = io(SOCKET_URL, {
      auth: token ? { token } : undefined,
      transports: ['websocket'],
      withCredentials: true,   // send cookies too, if you rely on them
    });
    setSocket(s);

    s.on('connect', () => {
      console.log('🔌 Socket connected, id=', s.id);
    });

    s.on('presence', ({ userId, isOnline }) => {
      setOnlineUsers(prev => ({ ...prev, [userId]: isOnline }));
    });

    s.on('disconnect', reason => {
      console.log('🔌 Socket disconnected:', reason);
      setSocket(null);
      setOnlineUsers({});
    });

    return () => {
      s.disconnect();
      setSocket(null);
      setOnlineUsers({});
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
