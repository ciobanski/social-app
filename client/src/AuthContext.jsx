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

  /* ───── helper: set / clear legacy header token (Google or old flow) ───── */
  const setToken = (token) => {
    if (token) {
      localStorage.setItem('authToken', token);
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      localStorage.removeItem('authToken');
      localStorage.removeItem('token');      // hydrate old key just in case
      delete api.defaults.headers.common.Authorization;
    }
  };

  /* ───── on mount: attach stored header (if any) & ping /auth/me ───── */
  useEffect(() => {
    (async () => {
      const stored = localStorage.getItem('authToken');
      if (stored) api.defaults.headers.common.Authorization = `Bearer ${stored}`;

      try {
        const { data } = await api.get('/auth/me', { withCredentials: true });
        setUser(data.user);                      // cookie or header valid
      } catch (err) {
        if (err.response?.status !== 401) console.error('Auth check failed:', err);
        setToken(null);
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    })();
  }, []);

  /* ───── LOGIN ───── */
  const login = async (email, password) => {
    try {
      const { data } = await api.post('/auth/login', { email, password }, { withCredentials: true });

      /* 1️⃣  Two-factor challenge */
      if (data.require2fa) {
        return { success: false, need2fa: true, userId: data.userId };
      }

      /* 2️⃣  Normal cookie-only success (preferred) */
      if (data.user && !data.token) {
        setUser(data.user);                      // JWT already in http-only cookie
        return { success: true };
      }

      /* 3️⃣  Legacy / Google flow with header token */
      if (data.token && data.user) {
        setToken(data.token);
        setUser(data.user);
        return { success: true };
      }

      /* Unexpected shape */
      return { success: false, message: 'Unexpected response from server.' };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Login failed.',
      };
    }
  };

  /* ───── LOGOUT ───── */
  const logout = async () => {
    try {
      await api.post('/auth/logout', {}, { withCredentials: true });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setToken(null);
      setUser(null);
    }
  };
  const refreshUser = async () => {
    try {
      const { data } = await api.get('/auth/me', { withCredentials: true });
      setUser(data.user);
    } catch {
      setUser(null);
    }
  };
  return (
    <AuthContext.Provider value={{ user, authLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
