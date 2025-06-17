// src/AuthContext.jsx
import React, { createContext, useState, useEffect } from 'react';
import { api } from './api';

const AuthContext = createContext({
  user: null,
  authLoading: true,
  login: async () => { },
  logout: async () => { },
});

export default AuthContext;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Helper to set/clear legacy header token (Google or old flow)
  const setToken = token => {
    if (token) {
      localStorage.setItem('authToken', token);
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      localStorage.removeItem('authToken');
      delete api.defaults.headers.common.Authorization;
    }
  };

  // On mount: rehydrate token & ping /auth/me
  useEffect(() => {
    // if we have a legacy header token, put it on every request
    const stored = localStorage.getItem('authToken');
    if (stored) {
      api.defaults.headers.common.Authorization = `Bearer ${stored}`;
    }

    // always ask the server “who am I?” so that cookie-only sessions work
    api
      .get('/auth/me', { withCredentials: true })
      .then(({ data }) => {
        setUser(data.user);
      })
      .catch(err => {
        if (err.response?.status !== 401) console.error(err);
        setUser(null);
        setToken(null);
      })
      .finally(() => {
        setAuthLoading(false);
      });
  }, []);

  // LOGIN
  const login = async (email, password) => {
    try {
      const { data } = await api.post(
        '/auth/login',
        { email, password },
        { withCredentials: true }
      );

      // 1️⃣ Two-factor challenge
      if (data.require2fa) {
        return { success: false, need2fa: true, userId: data.userId };
      }

      // 2️⃣ Cookie-only success
      if (data.user && !data.token) {
        setUser(data.user);
        return { success: true };
      }

      // 3️⃣ Legacy / Google flow with header token
      if (data.token && data.user) {
        setToken(data.token);
        setUser(data.user);
        return { success: true };
      }

      return { success: false, message: 'Unexpected response from server.' };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed.',
      };
    }
  };

  // LOGOUT
  const logout = async () => {
    // 1) clear everything local instantly
    setToken(null);
    setUser(null);
    // 2) then tell the server (if it still has a cookie)
    try {
      await api.post('/auth/logout', {}, { withCredentials: true });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Manual refresh if you need it
  const refreshUser = async () => {
    try {

      const { data } = await api.get('/auth/me', { withCredentials: true });
      setUser(data.user);
    } catch {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, authLoading, login, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}
