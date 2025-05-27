// src/components/Navbar.jsx

import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { AuthContext } from '../AuthContext';

export default function Navbar() {
  const { user, setUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      // optional: tell the server to invalidate the refresh token
      await api.post('/auth/logout');
    } catch {
      // you can ignore errors here
    }

    // clear local auth state
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login');
  };

  if (!user) return null;

  return (
    <nav className="flex justify-between items-center p-4 bg-gray-800 text-white">
      <Link to="/" className="text-xl font-bold">
        SocialApp
      </Link>
      <div className="space-x-4">
        <Link to="/" className="hover:underline">
          Feed
        </Link>
        <Link to={`/profile/${user.id}`} className="hover:underline">
          Profile
        </Link>
        <Link to="/notifications" className="hover:underline">
          Notifications
        </Link>
        {user.role === 'admin' && (
          <Link to="/admin" className="hover:underline">
            Admin
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="ml-2 px-3 py-1 border rounded hover:bg-red-600"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
