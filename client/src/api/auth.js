// src/api/auth.js
import { api } from './index';   // path to your Axios instance

export const requestReset = (email) =>
  api.post('/auth/request-password-reset', { email });

export const resetPassword = (token, newPassword) =>
  api.post('/auth/reset-password', { token, newPassword });
