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

  // Helper to set/clear our JWT
  const setToken = (token) => {
    if (token) {
      localStorage.setItem('authToken', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      localStorage.removeItem('authToken');
      localStorage.removeItem('token'); // also clear old key, if it exists
      delete api.defaults.headers.common['Authorization'];
    }
  };

  // On mount: check existing authToken
  useEffect(() => {
    (async () => {
      // 1) If we still have a header token (old flow) attach it
      const stored = localStorage.getItem('authToken');
      if (stored) {
        api.defaults.headers.common['Authorization'] = `Bearer ${stored}`;
      }

      // 2) In every case, ping /auth/me (cookie travels automatically)
      try {
        const { data } = await api.get('/auth/me', { withCredentials: true });
        setUser(data.user);
      } catch {
        setToken(null);           // clears localStorage if it was wrong
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    })();
  }, []);

  // login(email,password) → POST /auth/login
  const login = async (email, password) => {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      const { token, user: me } = data;
      setToken(token);
      setUser(me);
      return { success: true };
    } catch (err) {
      console.error('Login error:', err);
      return {
        success: false,
        message:
          err.response?.data?.message ||
          'Login failed: please check your credentials.',
      };
    }
  };

  // logout() → POST /auth/logout
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
