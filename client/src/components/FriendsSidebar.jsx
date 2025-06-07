// src/components/FriendsSidebar.jsx

import React from 'react';

// A short fade-in keyframe for list items (add this to your global CSS if not already present)
/* In your index.css or tailwind.css, include:
@keyframes fadeIn {
  0%   { opacity: 0; transform: translateY(10px); }
  100% { opacity: 1; transform: translateY(0); }
}
*/

/* Tailwind utility to apply the above animation (in tailwind.config.js, under `theme.extend.animation`):
  animation: {
    fadeIn: 'fadeIn 0.5s ease-out both',
  },
*/

const fakeFriends = [
  { id: 1, name: 'Alice Wonderland', isOnline: true },
  { id: 2, name: 'Bob Builder', isOnline: false },
  { id: 3, name: 'Charlie Chaplin', isOnline: true },
  { id: 4, name: 'Diana Prince', isOnline: true },
  { id: 5, name: 'Eve Polastri', isOnline: false },
  { id: 6, name: 'Frank Sinatra', isOnline: true },
  { id: 7, name: 'Grace Hopper', isOnline: true },
  { id: 8, name: 'Hank Scorpio', isOnline: false },
];

export default function FriendsSidebar() {
  const loading = false; // Toggle to `true` if you want skeleton placeholders

  return (
    <div className="p-4 w-full h-[calc(100vh-4rem)] overflow-y-auto bg-gray-800">
      <h2 className="text-xl font-semibold text-white mb-3">Friends</h2>

      {loading ? (
        // Skeleton placeholders while loading
        Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center mb-4 space-x-3 animate-pulse">
            <div className="w-10 h-10 bg-gray-700 rounded-full" />
            <div className="h-4 bg-gray-700 rounded w-24" />
          </div>
        ))
      ) : (
        <ul>
          {fakeFriends.map((friend, index) => {
            // Compute initials
            const initials = friend.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase();

            return (
              <li
                key={friend.id}
                className={`
                  flex items-center p-2 mb-2 rounded-lg cursor-pointer
                  hover:bg-gray-700 transition-colors
                  animate-fadeIn
                `}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {/* Avatar circle with initials */}
                <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold mr-3">
                  {initials}
                </div>

                {/* Name and status */}
                <div>
                  <p className="text-white font-medium">{friend.name}</p>
                  <span
                    className={`text-sm ${friend.isOnline ? 'text-green-300' : 'text-gray-400'
                      }`}
                  >
                    {friend.isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
