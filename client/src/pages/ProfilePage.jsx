// src/pages/ProfilePage.jsx

import React, { useEffect, useState, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { toast } from 'react-toastify';
import AuthContext from '../AuthContext';
import EditProfileModal from '../components/EditProfileModal';

dayjs.extend(customParseFormat);

export default function ProfilePage() {
  const { id } = useParams();
  const { user: me, reload: reloadMe } = useContext(AuthContext);

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  // fetch profile
  useEffect(() => {
    setLoadingProfile(true);
    api
      .get(`/users/${id}`)
      .then((res) => setProfile(res.data))
      .catch((err) => {
        console.error(err);
        toast.error(
          err.response?.status === 404
            ? 'User not found'
            : 'Could not load profile'
        );
      })
      .finally(() => setLoadingProfile(false));
  }, [id]);

  // fetch their posts
  useEffect(() => {
    setLoadingPosts(true);
    api
      .get(`/users/${id}/posts`)
      .then((res) => setPosts(res.data))
      .catch((err) => {
        console.error(err);
        toast.error('Could not load user posts');
      })
      .finally(() => setLoadingPosts(false));
  }, [id]);

  const formatDate = (raw) => {
    let d = dayjs(raw, 'DD-MM-YYYY HH:mm:ss', true);
    if (!d.isValid()) d = dayjs(raw);
    return d.isValid() ? d.format('MMM D, YYYY h:mm A') : 'Invalid date';
  };

  const isMe = me?.id === id;

  if (loadingProfile) {
    return (
      <div className="flex justify-center items-center mt-8">
        <svg
          className="animate-spin h-8 w-8 text-indigo-600"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8z"
          ></path>
        </svg>
      </div>
    );
  }

  if (!profile) {
    return (
      <p className="text-red-500 text-center mt-8">User not found.</p>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* ── Header ───────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start mb-8 gap-4">
        <div className="flex-shrink-0">
          <img
            src={profile.avatarUrl || ''}
            alt={`${profile.firstName} avatar`}
            className="w-24 h-24 rounded-full object-cover border-2 border-indigo-500"
          />
        </div>
        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {profile.firstName} {profile.lastName}
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            {profile.country || '—'}
          </p>
          <p className="text-gray-600 dark:text-gray-300">
            {profile.birthday
              ? dayjs(profile.birthday).format('MMMM D, YYYY')
              : ''}
          </p>
          {isMe && (
            <button
              onClick={() => setEditOpen(true)}
              className="mt-2 inline-flex items-center px-4 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md transition"
            >
              Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* ── Their Posts ─────────────────────── */}
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Posts
      </h2>
      {loadingPosts ? (
        <div className="flex justify-center mt-4">
          <svg
            className="animate-spin h-8 w-8 text-indigo-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8z"
            ></path>
          </svg>
        </div>
      ) : posts.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-300">No posts yet.</p>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <div
              key={post._id}
              className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden"
            >
              <div className="flex items-center px-4 py-3">
                <img
                  src={post.author.avatarUrl}
                  alt={`${post.author.firstName} avatar`}
                  className="w-10 h-10 rounded-full object-cover mr-3 border border-gray-300"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {post.author.firstName} {post.author.lastName}
                  </p>
                  <p className="text-gray-500 text-sm">
                    {formatDate(post.createdAt)}
                  </p>
                </div>
              </div>
              <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
                <p className="text-gray-800 dark:text-gray-200">
                  {post.content}
                </p>
              </div>
              <div className="flex items-center justify-start px-4 py-2 border-t border-gray-200 dark:border-gray-700">
                <button
                  className="flex items-center mr-4 text-gray-600 dark:text-gray-300 hover:text-indigo-600"
                // pretend handleLike exists
                >
                  {post.liked ? (
                    <svg
                      className="w-5 h-5 text-red-500 mr-1"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M3.172 5.172a4 4 0 015.656 0L10 6.344l1.172-1.172a4 4 0 115.656 5.656L10 17.656l-6.828-6.828a4 4 0 010-5.656z" />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z"
                      />
                    </svg>
                  )}
                  <span className="text-sm">{post.likeCount}</span>
                </button>
                <button className="flex items-center text-gray-600 dark:text-gray-300 hover:text-indigo-600">
                  <svg
                    className="w-5 h-5 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.963 9.963 0 01-4.026-.819L3 20l1.164-4.656A7.963 7.963 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  <span className="text-sm">{post.commentCount}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Edit Profile Modal ─────────────── */}
      <EditProfileModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        profile={profile}
        setProfile={setProfile}
        reloadMe={reloadMe}
      />
    </div>
  );
}
