// src/AppRoutes.jsx
import React, { useContext, Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AuthContext from './AuthContext';
import Layout from './components/Layout';

// lazy‐loaded pages
const AuthPage = lazy(() => import('./pages/AuthPage'));
const FeedPage = lazy(() => import('./pages/FeedPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const SavedPostsPage = lazy(() => import('./pages/SavedPostsPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));

export default function AppRoutes() {
  const { user, authLoading } = useContext(AuthContext);

  // 1️⃣ While we’re still checking session, don’t render ANYTHING:
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading…
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        Loading…
      </div>
    }>
      {user ? (
        /* ───────────── PRIVATE ───────────── */
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<FeedPage />} />
            <Route path="/profile/:id" element={<ProfilePage />} />
            <Route path="saved" element={<SavedPostsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            {/* admin only */}
            <Route
              path="/admin"
              element={
                // 2️⃣ Optional‐chain here so we never do `null.role`
                user?.role === 'admin'
                  ? <AdminDashboard />
                  : <Navigate to="/" />
              }
            />
            <Route path="*" element={<Navigate to="/" />} />
          </Route>
        </Routes>
      ) : (
        /* ───────────── PUBLIC ───────────── */
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      )}
    </Suspense>
  );
}
