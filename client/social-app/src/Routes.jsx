// src/Routes.jsx
import React, { useContext } from 'react';
import { Route, Switch, Redirect } from 'react-router-dom';
import { AuthContext } from './AuthContext';

import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import FeedPage from './pages/FeedPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';

export default function Routes() {
  const { user } = useContext(AuthContext);

  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/signup" component={SignupPage} />

      {/* Protected */}
      <Route
        path="/admin"
        render={() => user?.role === 'admin' ? <AdminPage /> : <Redirect to="/" />}
      />

      <Route
        path="/profile/:id?"
        render={() => user ? <ProfilePage /> : <Redirect to="/login" />}
      />
      <Route
        path="/"
        render={() => user ? <FeedPage /> : <Redirect to="/login" />}
      />
    </Switch>
  );
}
