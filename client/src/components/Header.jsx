// src/components/Header.jsx

import React, { useContext } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import AuthContext from '../AuthContext';
import { FiSearch, FiUser, FiSettings, FiLogOut } from 'react-icons/fi';

export default function Header() {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);

  return (
    <header className="fixed top-0 left-0 w-full h-16 bg-base-100 shadow-md flex items-center px-4 z-50">
      {/* Logo */}
      <RouterLink to="/" className="text-2xl font-bold text-primary">
        Echo
      </RouterLink>

      {/* Search */}
      <div className="flex-1 flex justify-center px-4">
        <div className="form-control w-full max-w-md">
          <label className="input-group">
            <span className="bg-base-200">
              <FiSearch />
            </span>
            <input
              type="text"
              placeholder="Search…"
              className="input input-bordered w-full"
            />
          </label>
        </div>
      </div>

      {/* Icons */}
      <nav className="flex items-center space-x-4">
        <RouterLink
          to={user ? `/profile/${user.id}` : '/login'}
          className="text-lg hover:text-primary transition"
        >
          <FiUser />
        </RouterLink>
        <RouterLink
          to="/settings"
          className="text-lg hover:text-primary transition"
        >
          <FiSettings />
        </RouterLink>
        <RouterLink
          to="#"
          onClick={(e) => {
            e.preventDefault();
            logout();
            navigate('/login');
          }}
          className="text-lg hover:text-primary transition"
        >
          <FiLogOut />
        </RouterLink>
      </nav>
    </header>
  );
}
