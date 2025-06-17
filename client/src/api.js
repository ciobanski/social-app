// src/api.js
import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.DEV
    ? 'http://localhost:5000/api'
    : '/api',
  withCredentials: true
});
// response interceptor to ignore 401s
api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      // we know this just means “no token / logged out” – swallow it
      return Promise.resolve({ data: null });
    }
    return Promise.reject(err);
  }
);

// 2️⃣ then your old request-token interceptor
api.interceptors.request.use(config => {
  const token = localStorage.getItem('authToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
