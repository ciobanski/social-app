// src/api/index.js
import axios from 'axios';

export const api = axios.create({
  // your VITE_API_URL should include “/api” (e.g. http://localhost:5000/api),
  // otherwise it falls back to http://localhost:5000/api
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
});
