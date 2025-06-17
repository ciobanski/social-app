// src/api.js
import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.DEV
    ? 'http://localhost:5000/api'
    : '/api',
  withCredentials: true
});
// api.interceptors.response.use(
//   res => res,
//   err => {
//     const url = err.config?.url || '';
//     if (err.response?.status === 401 && !url.endsWith('/auth/me')) {
//       // for all other endpoints just return null data
//       return Promise.resolve({ data: null });
//     }
//     // for /auth/me (and anything else) rethrow
//     return Promise.reject(err);
//   }
// );

// 2️⃣ then your old request-token interceptor
api.interceptors.request.use(config => {
  const token = localStorage.getItem('authToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
