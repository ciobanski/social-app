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

  // Store or clear token in localStorage + set Axios header
  const setToken = (token) => {
    if (token) {
      sessionStorage.setItem('authToken', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      sessionStorage.removeItem('authToken');
      delete api.defaults.headers.common['Authorization'];
    }
  };

  // On mount: look for a saved token and validate it via /auth/me
  useEffect(() => {
    (async () => {
      const stored = sessionStorage.getItem('authToken');
      if (!stored) {
        setAuthLoading(false);
        return;
      }
      api.defaults.headers.common['Authorization'] = `Bearer ${stored}`;
      try {
        const { data } = await api.get('/auth/me');
        // backend returns { user: { … } }
        setUser(data.user);
      } catch (err) {
        console.error('Auth check failed:', err);
        setToken(null);
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    })();
  }, []);

  // login(email, password) → POST /api/auth/login
  const login = async (email, password) => {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      // response: { token, user: { … } }
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

  // logout() → POST /api/auth/logout
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
