// src/components/ProtectedRoute.jsx
import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import AuthContext from '../AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, authLoading } = useContext(AuthContext);
  const loc = useLocation();

  if (authLoading) return null;             // or a spinner
  if (!user) return <Navigate to="/login" state={{ from: loc }} replace />;

  return children;
}
