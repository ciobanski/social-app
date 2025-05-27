// src/socket.js
import { io } from 'socket.io-client';

export const socket = io(import.meta.env.VITE_API_URL.replace('/api', ''), {
  autoConnect: false,
  auth: { token: localStorage.getItem('token') }
});
