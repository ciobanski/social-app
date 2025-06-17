import React, { useEffect, useState, useContext } from 'react';
import AuthContext from '../AuthContext';
import { Link } from 'react-router-dom';
import { api } from '../api';
import defaultAvatar from '../assets/default-avatar.png';

export default function FriendsSidebar() {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useContext(AuthContext);
  useEffect(() => {
    let mounted = true;
    if (!user) return;
    api.get('/friends')
      .then(res => {
        if (mounted) setFriends(res.data.friends);
      })
      .catch(console.error)
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false };
  }, []);

  return (
    <div className="bg-base-100 dark:bg-base-300 w-68 p-4 mt-4 rounded-lg border border-base-content/10 shadow space-y-4">
      <h2 className="text-lg font-semibold text-base-content">Friends</h2>

      {loading ? (
        Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center space-x-3 animate-pulse"
          >
            <div className="w-10 h-10 bg-base-content/20 rounded-full" />
            <div className="h-4 bg-base-content/20 rounded w-24" />
          </div>
        ))
      ) : friends.length === 0 ? (
        <p className="text-base-content/60">No friends yet.</p>
      ) : (
        <ul className="space-y-2 max-h-[calc(100vh-6rem)] overflow-y-auto">
          {friends.map(f => (
            <li key={f._id}>
              <Link
                to={`/profile/${f._id}`}
                className="flex items-center p-2 rounded-lg hover:bg-base-content/5 transition-colors"
              >
                <img
                  src={f.avatarUrl || defaultAvatar}
                  alt={`${f.firstName} avatar`}
                  className="w-10 h-10 rounded-full object-cover mr-3"
                />
                <span className="text-base-content font-medium">
                  {f.firstName} {f.lastName}
                </span>
              </Link>
              <hr className="border-base-content/5 mb-4" />

            </li>

          ))}
        </ul>
      )}
    </div>
  );
}
