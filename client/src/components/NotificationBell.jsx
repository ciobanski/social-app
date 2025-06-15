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

  // Load all notifications when the user logs in
  useEffect(() => {
    if (!user) return;
    api.get('/notifications')
      .then(res => setNotes(res.data.notifications || []))
      .catch(err => {
        console.error('Could not fetch notifications:', err);
        toast.error('Failed to load notifications');
      });
  }, [user]);

  // Mark all as read locally when dropdown opens
  useEffect(() => {
    if (open) {
      setNotes(ns => ns.map(n => ({ ...n, read: true })));
      // optional: api.patch('/notifications/mark-all-read').catch(console.error);
    }
  }, [open]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = e => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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
            /*  ← cap height here and make scrollable ↓ */
            <div className="max-h-[60vh] overflow-y-auto divide-y divide-base-content/10">
              {notes.map(note => {
                const actor = note.entity?.from;
                const avatar = actor?.avatarUrl || defaultAvatar;
                const name = actor
                  ? `${actor.firstName} ${actor.lastName}`
                  : 'Someone';

                switch (note.type) {
                  case 'friend_request':
                    return (
                      <div
                        key={note._id}
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
                            onClick={() =>
                              api.post(`/friends/accept/${actor._id}`)
                                .then(() =>
                                  setNotes(ns =>
                                    ns.filter(n => n._id !== note._id)
                                  )
                                )
                                .then(() => toast.success('Friend request accepted'))
                                .catch(() => toast.error('Could not accept request'))
                            }
                            className="btn btn-xs btn-circle btn-success"
                            title="Accept"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() =>
                              api.post(`/friends/reject/${actor._id}`)
                                .then(() =>
                                  setNotes(ns =>
                                    ns.filter(n => n._id !== note._id)
                                  )
                                )
                                .then(() => toast.success('Friend request rejected'))
                                .catch(() => toast.error('Could not reject request'))
                            }
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
                        key={note._id}
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
                        key={note._id}
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
                        key={note._id}
                        className="flex items-center p-3 hover:bg-base-content/5 transition-colors"
                      >
                        <img
                          src={avatar}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover mr-3"
                        />
                        <span className="text-base-content">
                          {name} commented on your post
                        </span>
                      </div>
                    );

                  case 'share':
                    return (
                      <div
                        key={note._id}
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
