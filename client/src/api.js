// src/api.js
import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',        // ← use the Vite proxy
  withCredentials: true,
});

// 1️⃣ swallow only the /auth/me 401
api.interceptors.response.use(
  res => res,
  err => {
    if (
      err.response?.status === 401 &&
      err.config.url?.endsWith('/auth/me')
    ) {
      // pretend it resolved to { user: null }
      return Promise.resolve({ data: { user: null } });
    }
    return Promise.reject(err);
  }
);

// 2️⃣ then your old request‐token interceptor
api.interceptors.request.use(config => {
  const token = localStorage.getItem('authToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
