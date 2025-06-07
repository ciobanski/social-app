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

  useEffect(() => {
    setLoadingPosts(true);
    api
      .get(`/users/${id}/posts`)
      .then((res) => setPosts(res.data))
      .catch(() => toast.error('Could not load user posts'))
      .finally(() => setLoadingPosts(false));
  }, [id]);

  const formatDate = (raw) => {
    let d = dayjs(raw, 'DD-MM-YYYY HH:mm:ss', true);
    if (!d.isValid()) d = dayjs(raw);
    return d.isValid()
      ? d.format('MMM D, YYYY h:mm A')
      : 'Invalid date';
  };

  const isMe = me?.id === id;

  if (loadingProfile) {
    return (
      <div className="flex justify-center items-center mt-8">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <p className="text-error text-center mt-8">
        User not found.
      </p>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
        <div className="flex-shrink-0">
          <div className="avatar">
            <div className="w-24 h-24 rounded-full ring ring-primary ring-offset-2">
              <img
                src={profile.avatarUrl || ''}
                alt={`${profile.firstName} avatar`}
              />
            </div>
          </div>
        </div>
        <div className="flex-1 text-center sm:text-left space-y-2">
          <h1 className="text-2xl font-semibold">
            {profile.firstName} {profile.lastName}
          </h1>
          <p className="text-base-content/70">
            {profile.country || '—'}
          </p>
          <p className="text-base-content/70">
            {profile.birthday
              ? dayjs(profile.birthday).format('MMMM D, YYYY')
              : ''}
          </p>
          {isMe && (
            <button
              onClick={() => setEditOpen(true)}
              className="btn btn-primary btn-sm mt-2"
            >
              Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* Posts */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">
          Posts
        </h2>

        {loadingPosts ? (
          <div className="flex justify-center mt-4">
            <span className="loading loading-spinner loading-lg text-primary" />
          </div>
        ) : posts.length === 0 ? (
          <p className="text-base-content/60">No posts yet.</p>
        ) : (
          posts.map((post) => (
            <div key={post._id} className="card bg-base-200 shadow">
              <div className="card-body space-y-2">
                <div className="flex items-center space-x-3">
                  <div className="avatar">
                    <div className="w-10 h-10 rounded-full">
                      <img
                        src={post.author.avatarUrl}
                        alt={`${post.author.firstName} avatar`}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="font-medium">
                      {post.author.firstName}{' '}
                      {post.author.lastName}
                    </p>
                    <p className="text-xs text-base-content/60">
                      {formatDate(post.createdAt)}
                    </p>
                  </div>
                </div>
                <p>{post.content}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Profile Modal */}
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
