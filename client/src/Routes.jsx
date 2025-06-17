// src/AppRoutes.jsx
import React, { useContext, Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AuthContext from './AuthContext';
import Layout from './components/Layout';

// lazy‐loaded pages
const AuthPage = lazy(() => import('./pages/AuthPage'));
const FeedPage = lazy(() => import('./pages/FeedPage'));
const ExplorePage = lazy(() => import('./pages/ExplorePage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SavedPostsPage = lazy(() => import('./pages/SavedPostsPage'));
const ResetPassword = lazy(() => import('./pages/ResetPasswordPage'));


export default function AppRoutes() {
  const { user, authLoading } = useContext(AuthContext);

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
        <Routes>
          <Route element={<Layout />}>
            {/* index = “/” */}
            <Route index element={<FeedPage />} />

            {/* /explore */}
            <Route path="explore" element={<ExplorePage />} />

            {/* /profile/:id */}
            <Route path="profile/:id" element={<ProfilePage />} />

            {/* /saved */}
            <Route path="saved" element={<SavedPostsPage />} />


            {/* anything else → back to friends feed */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      ) : (
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      )}
    </Suspense>
  );
}
