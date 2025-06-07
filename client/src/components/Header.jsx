// src/components/Header.jsx
import React, { useContext } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import AuthContext from '../AuthContext';
import SearchIcon from '@mui/icons-material/Search';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';

export default function Header() {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);

  return (
    <header className="fixed top-0 left-0 w-full h-16 bg-gray-800 shadow-md flex items-center px-4 z-50">
      {/* Left: Logo */}
      <RouterLink to="/" className="text-2xl font-bold text-indigo-400 hover:text-indigo-300">
        Echo
      </RouterLink>

      {/* Center: Search Bar */}
      <div className="flex-1 flex justify-center">
        <div className="relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <SearchIcon className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search…"
            className="
              w-full
              pl-10
              pr-4
              py-2
              rounded-lg
              bg-gray-700
              text-white
              placeholder-gray-400
              focus:outline-none
              focus:ring-2
              focus:ring-indigo-500
            "
          />
        </div>
      </div>

      {/* Right: Icons */}
      <nav className="flex items-center space-x-4">
        <RouterLink
          to={user ? `/profile/${user.id}` : '/login'}
          className="p-2 rounded-full hover:bg-gray-700"
        >
          <AccountCircleIcon className="text-gray-200" />
        </RouterLink>
        <RouterLink
          to="/settings"
          className="p-2 rounded-full hover:bg-gray-700"
        >
          <SettingsIcon className="text-gray-200" />
        </RouterLink>
        <button
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className="p-2 rounded-full hover:bg-gray-700"
        >
          <LogoutIcon className="text-gray-200" />
        </button>
      </nav>
    </header>
  );
}
