// src/api.js
import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // e.g. "http://localhost:5000/api"
  withCredentials: true,                // if you ever rely on cookies
});

// Inject the Bearer token from localStorage into every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
