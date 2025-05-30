// src/AuthContext.jsx
import React, { createContext, useState, useEffect } from 'react';
import { api } from './api';

export const AuthContext = createContext();

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadMe() {
    try {
      const { data } = await api.get('/auth/me');
      // /auth/me returns the user fields at top-level, not under `user`
      setUser(data.user ?? data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMe();
  }, []);

  // <-- ADD this:
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    }
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, reload: loadMe, logout }}>
      {loading ? <div>Loading…</div> : children}
    </AuthContext.Provider>
  );
}
