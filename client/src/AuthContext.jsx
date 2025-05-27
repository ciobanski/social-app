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
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, reload: loadMe }}>
      {loading ? <div className="p-4">Loading…</div> : children}
    </AuthContext.Provider>
  );
}
