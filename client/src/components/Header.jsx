// src/components/Header.jsx

import React, { useContext, useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import AuthContext from '../AuthContext';
import {
  FiSearch,
  FiUser,
  FiSettings,
  FiLogOut,
  FiSun,
  FiMoon,
} from 'react-icons/fi';
import NotificationBell from './NotificationBell';


export default function Header() {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);

  const [theme, setTheme] = useState(
    localStorage.getItem('theme') || 'light'
  );
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);
  const toggleTheme = () => setTheme(t => (t === 'light' ? 'dark' : 'light'));

  return (
    <header className="fixed top-0 left-0 w-full h-16 bg-base-100 shadow-md flex items-center px-4 z-50">
      <RouterLink to="/" className="text-2xl font-bold text-primary">
        <img className="max-w-56" src='../logo.svg' alt='Echo'></img>
      </RouterLink>

      {/* Search */}
      <div className="flex-1 flex justify-center px-4">
        <div className="relative w-full max-w-md">
          <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-base-content/60" />
          <input
            type="text"
            placeholder="Search…"
            className="input input-bordered w-full pl-12 pr-4 rounded-full"
          />
        </div>
      </div>

      {/* Icons */}
      <nav className="flex items-center space-x-4">
        {/* theme toggle */}
        <button
          onClick={toggleTheme}
          className="icon-button text-lg hover:text-primary transition"
          aria-label="Toggle dark/light mode"
        >
          {theme === 'light' ? <FiMoon /> : <FiSun />}
        </button>

        {/* notification bell */}
        <NotificationBell />

        {/* profile */}
        <RouterLink
          to={user ? `/profile/${user.id}` : '/login'}
          className="icon-button text-lg hover:text-primary transition"
          aria-label="Your profile"
        >
          <FiUser />
        </RouterLink>

        {/* settings */}
        <RouterLink
          to="/settings"
          className="icon-button text-lg hover:text-primary transition"
          aria-label="Settings"
        >
          <FiSettings />
        </RouterLink>

        {/* logout */}
        <RouterLink
          to="#"
          onClick={e => {
            e.preventDefault();
            logout();
            navigate('/login');
          }}
          className="icon-button text-lg hover:text-primary transition"
          aria-label="Log out"
        >
          <FiLogOut />
        </RouterLink>
      </nav>
    </header>
  );
}
