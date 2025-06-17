// src/components/ProfileSidebar.jsx
import React, { useEffect, useState, useContext } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiUser, FiCompass } from 'react-icons/fi';
import { BsBookmark } from 'react-icons/bs';
import AuthContext from '../AuthContext';
import { api } from '../api';
import defaultAvatar from '../assets/default-avatar.png';

export default function ProfileSidebar({ profileUser }) {
  const { id } = useParams();
  const { user: me } = useContext(AuthContext);

  // profileUser prop wins (ProfilePage),
  // else if on /profile/:id we’ll fetch that,
  // else we’ll fetch the current-user record to get avatarUrl.
  const [profile, setProfile] = useState(profileUser ?? me);

  useEffect(() => {
    if (profileUser) {
      // Parent gave us a fully-loaded profile
      setProfile(profileUser);
      return;
    }

    // Compute which userId to load:
    const userIdToFetch = id ?? me?.id;
    if (!userIdToFetch) {
      // nothing to fetch yet, drop back to me (even if me.avatarUrl is missing)
      setProfile(me);
      return;
    }
    if (!me) return;
    api.get(`/users/${userIdToFetch}`)
      .then(res => setProfile(res.data))
      .catch(() => {
        // on error just show whatever we had
        setProfile(me);
      });
  }, [id, me, profileUser]);

  const avatarSrc = profile?.avatarUrl?.trim()
    ? profile.avatarUrl
    : defaultAvatar;

  const links = [
    { label: 'View Profile', icon: <FiUser size={20} />, to: `/profile/${profile.id}` },
    { label: 'Saved Posts', icon: <BsBookmark size={20} />, to: '/saved' },
    { label: 'Explore', icon: <FiCompass size={20} />, to: '/explore' },
  ];

  return (
    <div className="card bg-base-200 dark:bg-base-300 p-4 border border-base-content/10 rounded-lg mt-4 lg:-ml-4">
      <div className="flex flex-col items-center mb-6">
        <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-base-content mb-2">
          <img
            src={avatarSrc}
            alt={`${profile.firstName} ${profile.lastName}`}
            onError={e => { e.currentTarget.src = defaultAvatar; }}
            className="object-cover w-full h-full"
          />
        </div>
        <div className="text-lg font-semibold text-base-content">
          {profile.firstName} {profile.lastName}
        </div>
      </div>

      <hr className="border-base-content/20 mb-4" />

      <ul className="space-y-2">
        {links.map(item => (
          <li key={item.label}>
            <Link
              to={item.to}
              className="flex items-center gap-3 p-2 rounded-lg text-base-content hover:bg-base-content/10 dark:hover:bg-base-content/20 transition-colors visited:text-base-content"
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
