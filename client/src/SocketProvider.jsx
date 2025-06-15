// // src/SocketProvider.jsx
// import React, { useEffect, useContext, createContext, useState } from 'react';
// import { io } from 'socket.io-client';
// import AuthContext from './AuthContext';

// const SOCKET_URL = import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '');

// const SocketContext = createContext({
//   socket: null,
//   onlineUsers: {},
// });

// export function useSocket() {
//   return useContext(SocketContext);
// }

// export default function SocketProvider({ children }) {
//   const { user } = useContext(AuthContext);
//   const [socket, setSocket] = useState(null);
//   const [onlineUsers, setOnlineUsers] = useState({});

//   useEffect(() => {
//     // if not logged in, tear down any existing connection
//     if (!user) {
//       if (socket) socket.disconnect();
//       setSocket(null);
//       return;
//     }

//     // establish new connection—cookies will be sent automatically
//     const s = io(SOCKET_URL, {
//       transports: ['websocket'],
//       withCredentials: true,    // ← send HTTP-only cookie
//     });

//     s.on('connect', () => {
//       console.log('🔌 Socket connected, id=', s.id);
//     });

//     s.on('presence', ({ userId, isOnline }) => {
//       setOnlineUsers(prev => ({ ...prev, [userId]: isOnline }));
//     });

//     setSocket(s);

//     return () => {
//       s.disconnect();
//     };
//   }, [user]);

//   return (
//     <SocketContext.Provider value={{ socket, onlineUsers }}>
//       {children}
//     </SocketContext.Provider>
//   );
// }
