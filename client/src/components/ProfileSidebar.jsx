// src/components/ProfileSidebar.jsx
import React, { useContext } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import AuthContext from '../AuthContext';

export default function ProfileSidebar() {
  const { user } = useContext(AuthContext);

  // Hard‐coded links for demo purposes:
  const links = [
    { label: 'View Profile', icon: 'person', to: `/profile/${user.id}` },
    { label: 'Settings', icon: 'settings', to: '/settings' },
    { label: 'Saved Posts', icon: 'bookmark', to: '/saved' },
  ];

  return (
    <div className="bg-gray-800 rounded-lg p-4 w-full">
      <div className="text-center mb-4">
        <img
          src={user.avatarUrl || '/placeholder-avatar.png'}
          alt="avatar"
          className="w-20 h-20 rounded-full mx-auto mb-2 object-cover"
        />
        <RouterLink
          to={`/profile/${user.id}`}
          className="block text-white text-xl font-bold hover:text-indigo-400"
        >
          {user.firstName} {user.lastName}
        </RouterLink>
      </div>

      <hr className="border-gray-700 mb-4" />

      <ul className="flex flex-col space-y-2">
        {links.map((item) => (
          <li key={item.label}>
            <RouterLink
              to={item.to}
              className="flex items-center p-2 rounded hover:bg-gray-700 transition-colors"
            >
              <span className="material-icons text-gray-300 mr-3">
                {item.icon}
              </span>
              <span className="text-white font-medium">{item.label}</span>
            </RouterLink>
          </li>
        ))}
      </ul>
    </div>
  );
}
