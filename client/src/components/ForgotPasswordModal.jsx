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
    <aside className="hidden lg:block lg:w-2/12 bg-base-100 rounded-lg p-4 space-y-4">
      <h2 className="text-lg font-semibold text-base-content">Friends</h2>

      {loading ? (
        // Skeleton placeholders while loading
        Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-3 animate-pulse">
            <div className="w-10 h-10 bg-neutral-focus rounded-full" />
            <div className="h-4 bg-neutral-focus rounded w-24" />
          </div>
        ))
      ) : (
        <ul className="space-y-3">
          {fakeFriends.map((friend, index) => {
            const initials = friend.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase();

            return (
              <li
                key={friend.id}
                className={`flex items-center p-2 rounded-lg hover:bg-base-200 cursor-pointer transition-colors animate-fadeIn`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="avatar">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-content flex items-center justify-center">
                    {initials}
                  </div>
                </div>
                <div className="ml-3">
                  <p className="font-medium text-base-content">
                    {friend.name}
                  </p>
                  <span
                    className={`text-sm ${friend.isOnline ? 'text-success' : 'text-base-content/60'
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
    </aside>
  );
}
