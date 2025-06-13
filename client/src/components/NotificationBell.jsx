// src/components/NotificationBell.jsx

import React, { useContext, useEffect, useState, useRef } from 'react';
import { FiBell } from 'react-icons/fi';
import { toast } from 'react-toastify';
import AuthContext from '../AuthContext';
import { api } from '../api';
import defaultAvatar from '../assets/default-avatar.png';

export default function NotificationBell() {
  const { user } = useContext(AuthContext);
  const [notes, setNotes] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef();

  // 1) Load all notifications when the user logs in
  useEffect(() => {
    if (!user) return;
    api.get('/notifications')
      .then(res => setNotes(res.data.notifications || []))
      .catch(console.error);
  }, [user]);

  // 2) When dropdown opens, mark everything read locally
  useEffect(() => {
    if (open) {
      setNotes(ns => ns.map(n => ({ ...n, read: true })));
      // Optional: persist this to server
      // api.patch('/notifications/mark-all-read').catch(console.error);
    }
  }, [open]);

  // 3) Close dropdown on outside click
  useEffect(() => {
    const handleClick = e => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Handlers for friend-requests
  const handleAccept = async note => {
    try {
      await api.post(`/friends/accept/${note.from._id}`);
      setNotes(ns => ns.filter(n => n._id !== note._id));
      toast.success('Friend request accepted');
    } catch (err) {
      console.error(err);
      toast.error('Could not accept request');
    }
  };
  const handleReject = async note => {
    try {
      await api.post(`/friends/reject/${note.from._id}`);
      setNotes(ns => ns.filter(n => n._id !== note._id));
      toast.success('Friend request rejected');
    } catch (err) {
      console.error(err);
      toast.error('Could not reject request');
    }
  };

  const unreadCount = notes.filter(n => !n.read).length;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative flex items-center justify-center icon-button text-lg hover:text-primary transition-colors"
        aria-label="Notifications"
      >
        <FiBell />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 bg-red-500 text-white text-xs rounded-full px-1">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-base-100 dark:bg-base-200 border border-base-content/10 rounded-lg shadow-lg z-50">
          {/* Header */}
          <div className="flex items-center space-x-2 px-4 py-2 border-b border-base-content/10 font-semibold text-base-content">
            <FiBell />
            <span>Notifications</span>
          </div>

          {/* Body */}
          {notes.length === 0 ? (
            <p className="p-4 text-center text-base-content/60">
              (no notifications)
            </p>
          ) : (
            <div className="divide-y divide-base-content/10">
              {notes.map(note => {
                const { _id, type, from, entity } = note;
                const avatar = from.avatarUrl || defaultAvatar;
                const name = `${from.firstName} ${from.lastName}`;

                switch (type) {
                  case 'friend_request':
                    return (
                      <div
                        key={_id}
                        className="flex items-center justify-between p-3 hover:bg-base-content/5 transition-colors"
                      >
                        <div className="flex items-center space-x-2">
                          <img
                            src={avatar}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <span className="text-base-content">
                            {name} sent you a friend request
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleAccept(note)}
                            className="btn btn-xs btn-circle btn-success"
                            title="Accept"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => handleReject(note)}
                            className="btn btn-xs btn-circle btn-error"
                            title="Reject"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );

                  case 'friend_accept':
                    return (
                      <div
                        key={_id}
                        className="flex items-center p-3 hover:bg-base-content/5 transition-colors"
                      >
                        <img
                          src={avatar}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover mr-3"
                        />
                        <span className="text-base-content">
                          {name} accepted your friend request
                        </span>
                      </div>
                    );

                  case 'like':
                    return (
                      <div
                        key={_id}
                        className="flex items-center p-3 hover:bg-base-content/5 transition-colors"
                      >
                        <img
                          src={avatar}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover mr-3"
                        />
                        <span className="text-base-content">
                          {name} liked your post
                        </span>
                      </div>
                    );

                  case 'comment':
                    return (
                      <div
                        key={_id}
                        className="flex items-center p-3 hover:bg-base-content/5 transition-colors"
                      >
                        <img
                          src={avatar}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover mr-3"
                        />
                        <span className="text-base-content">
                          {name} commented: “{entity.commentText}”
                        </span>
                      </div>
                    );

                  case 'share':
                    return (
                      <div
                        key={_id}
                        className="flex items-center p-3 hover:bg-base-content/5 transition-colors"
                      >
                        <img
                          src={avatar}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover mr-3"
                        />
                        <span className="text-base-content">
                          {name} shared your post
                        </span>
                      </div>
                    );

                  // future: case 'mention': …

                  default:
                    return null;
                }
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
