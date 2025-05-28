// src/api.js
import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    error ? prom.reject(error) : prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    const originalRequest = err.config;
    if (err.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch(e => Promise.reject(e));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      return new Promise((resolve, reject) => {
        api
          .post('/auth/refresh-token')
          .then(({ data }) => {
            localStorage.setItem('token', data.token);
            api.defaults.headers.common.Authorization = `Bearer ${data.token}`;
            processQueue(null, data.token);
            resolve(api(originalRequest));
          })
          .catch(refreshErr => {
            processQueue(refreshErr, null);
            reject(refreshErr);
          })
          .finally(() => {
            isRefreshing = false;
          });
      });
    }
    return Promise.reject(err);
  }
);
