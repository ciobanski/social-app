// src/pages/ProfilePage.jsx

import React, { useEffect, useState, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { toast } from 'react-toastify';
import { MdCake, MdPeople } from 'react-icons/md';
import { FiCheck, FiUserMinus, FiArrowUp } from 'react-icons/fi';
import { v4 as uuidv4 } from 'uuid';
import AuthContext from '../AuthContext';
import EditProfileModal from '../components/EditProfileModal';
import PostCard from '../components/PostCard';
import defaultAvatar from '../assets/default-avatar.png';

dayjs.extend(customParseFormat);

export default function ProfilePage() {
  const { id } = useParams();
  const { user: me, reload: reloadMe, authLoading } = useContext(AuthContext);

  const [showScroll, setShowScroll] = useState(false);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  const isMe = me?.id === id;

  // ─── scroll-to-top listener ────────────────────────────────
  useEffect(() => {
    const onScroll = () => setShowScroll(window.pageYOffset > 300);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const scrollToTop = () =>
    window.scrollTo({ top: 0, behavior: 'smooth' });

  // ─── Load profile info ──────────────────────────────────────
  useEffect(() => {
    setLoadingProfile(true);
    if (authLoading || !me) return;
    api.get(`/users/${id}`)
      .then(res => setProfile(res.data))
      .catch(err => {
        console.error(err);
        toast.error(err.response?.status === 404 ? 'User not found' : 'Could not load profile');
      })
      .finally(() => setLoadingProfile(false));
  }, [id, me, authLoading]);

  // ─── Load **both** posts & shares in one go ─────────────────
  useEffect(() => {
    async function loadPostsAndShares() {
      setLoadingPosts(true);
      try {
        if (authLoading || !me) return;
        // fetch the unified feed (server already merged & sorted)
        const { data: feed } = await api.get('/posts', { params: { limit: 1000 } });
        // keep only items authored or shared by this profile
        const combined = feed.filter(item =>
          (item.type === 'post' && item.author._id === id) ||
          (item.type === 'share' && item.sharer._id === id)
        );
        setPosts(combined);
      } catch (err) {
        console.error(err);
        toast.error('Could not load posts');
      } finally {
        setLoadingPosts(false);
      }
    }
    if (me) loadPostsAndShares();
  }, [id, me, authLoading]);

  // ─── Refresh “saved” flags ───────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    if (authLoading || !me) return;
    api.get('/users/me/saves')
      .then(res => {
        if (!isMounted) return;
        const savedIds = new Set(res.data.map(p => p._id));
        setPosts(prev =>
          prev.map(p => ({
            ...p,
            saved: p.type === 'post' ? savedIds.has(p._id) : p.saved
          }))
        );
      })
      .catch(console.error);
    return () => { isMounted = false; };
  }, [posts, me, authLoading]);

  // ─── Friendship actions ────────────────────────────────────
  const alreadyFriends = Array.isArray(profile?.friends)
    && profile.friends.map(String).includes(me?.id);

  const handleAddFriend = async () => {
    try {
      await api.post(`/friends/request/${id}`);
      toast.success('Friend request sent');
      setRequestSent(true);
    } catch (err) {
      if (err.response?.status === 409) {
        toast.info('Request already sent or you’re already friends');
        setRequestSent(true);
      } else {
        toast.error('Could not send friend request');
      }
    }
  };

  const handleRemoveFriend = async () => {
    try {
      await api.delete(`/friends/${id}`);
      toast.success('Friend removed');
      setProfile(p => ({
        ...p,
        friendCount: (p.friendCount ?? 1) - 1,
        friends: Array.isArray(p.friends)
          ? p.friends.filter(fid => String(fid) !== me.id)
          : p.friends
      }));
      if (typeof reloadMe === 'function') {
        try { await reloadMe(); } catch { /* ignore */ }
      }
    } catch {
      toast.error('Could not remove friend');
    }
  };

  // ─── PostCard callbacks ────────────────────────────────────
  const handleLike = (postId, liked, cnt) =>
    setPosts(ps => ps.map(p => p._id === postId ? { ...p, liked, likeCount: cnt } : p));
  const handleSave = (postId, saved) =>
    setPosts(ps => ps.map(p => p._id === postId ? { ...p, saved } : p));
  const handleShare = original => {
    const stubId = `stub-${uuidv4()}`;
    const stub = {
      _id: stubId,
      type: 'share',
      sharer: { ...me },
      original,
      saved: false,
      liked: false,
      createdAt: new Date().toISOString(),
      shared: true,
    };
    setPosts(ps => [stub, ...ps]);
    api.post(`/shares/${original._id}`)
      .then(() => toast.success('Post shared'))
      .catch(err => {
        if (err.response?.status === 409) toast.info('Already shared');
        else {
          console.error(err);
          toast.error('Share failed');
        }
        setPosts(ps => ps.filter(x => x._id !== stubId));
      });
  };
  const handleReport = () => toast.success('Reported');
  const handleCommentAdded = postId =>
    setPosts(ps => ps.map(p => p._id === postId ? { ...p, commentCount: (p.commentCount || 0) + 1 } : p));
  const handleDelete = async postId => {
    try {
      await api.delete(`/posts/${postId}`);
      setPosts(ps => ps.filter(p => p._id !== postId));
      toast.success('Post deleted');
    } catch {
      toast.error('Delete failed');
    }
  };

  // ─── Loading / not-found states ────────────────────────────
  if (loadingProfile) {
    return (
      <div className="flex justify-center items-center mt-8">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }
  if (!profile) {
    return <p className="text-error text-center mt-8">User not found.</p>;
  }

  // ─── Render ────────────────────────────────────────────────
  const avatarSrc = profile.avatarUrl?.trim() ? profile.avatarUrl : defaultAvatar;
  const fmtDate = raw => {
    let d = dayjs(raw, 'DD-MM-YYYY HH:mm:ss', true);
    if (!d.isValid()) d = dayjs(raw);
    return d.isValid() ? d.format('MMM D, YYYY') : '';
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="w-24 h-24 rounded-full ring ring-primary ring-offset-2 overflow-hidden">
            <img
              src={avatarSrc}
              alt={`${profile.firstName} avatar`}
              onError={e => { e.currentTarget.src = defaultAvatar; }}
              className="object-cover w-full h-full"
            />
          </div>
        </div>
        {/* Info */}
        <div className="flex-1 text-center sm:text-left space-y-1">
          <h1 className="text-2xl font-semibold text-base-content">
            {profile.firstName} {profile.lastName}
          </h1>
          <p className="text-base-content/70">{profile.country || '—'}</p>
          {profile.birthday && (
            <p className="text-base-content/70 flex items-center gap-1">
              <MdCake size={18} /> {fmtDate(profile.birthday)}
            </p>
          )}
          <p className="text-base-content/70 flex items-center gap-1">
            <MdPeople size={18} /> Friends: {profile.friendCount ?? 0}
          </p>
        </div>
        {/* Actions */}
        <div className="flex flex-col space-y-2">
          {isMe ? (
            <button onClick={() => setEditOpen(true)} className="btn btn-primary btn-sm">
              Edit Profile
            </button>
          ) : alreadyFriends ? (
            <>
              <button disabled className="btn btn-secondary btn-sm opacity-50 cursor-default flex items-center gap-1">
                <FiCheck size={16} /> Friends
              </button>
              <button onClick={handleRemoveFriend} className="btn btn-outline btn-sm text-error flex items-center gap-1">
                <FiUserMinus size={16} /> Remove Friend
              </button>
            </>
          ) : (
            <button
              onClick={handleAddFriend}
              disabled={requestSent}
              className={`btn btn-outline btn-sm ${requestSent ? 'opacity-50 cursor-default' : ''}`}
            >
              {requestSent ? 'Requested' : 'Add Friend'}
            </button>
          )}
        </div>
      </div>

      {/* POSTS */}
      <div className="space-y-6">
        {loadingPosts ? (
          [0, 1, 2].map(i => (
            <div key={i} className="h-48 bg-base-content/10 animate-pulse rounded-lg" />
          ))
        ) : posts.length === 0 ? (
          <p className="text-base-content/60 text-center">No posts yet.</p>
        ) : (
          posts.map(post => (
            <PostCard
              key={post._id}
              post={post}
              onLike={handleLike}
              onSave={handleSave}
              onShare={handleShare}
              onReport={handleReport}
              onCommentAdded={handleCommentAdded}
              onDelete={handleDelete}
              isSharedPreview={post.type === 'share'}
              sharer={post.sharer}
            />
          ))
        )}
      </div>

      {/* Scroll-to-top */}
      {showScroll && (
        <button
          onClick={scrollToTop}
          className="
                      fixed bottom-4 left-4 p-3
                      bg-base-100 dark:bg-base-800
                      rounded-sm
                      border border-gray-300 dark:border-gray-600
                      text-black dark:text-white
                      shadow-lg
                      hover:bg-base-200 dark:hover:bg-base-700
                      transition-colors
                      cursor-pointer
                      "
        >
          <FiArrowUp size={24} color='#9f9f9f' />
        </button>
      )}

      {/* EDIT PROFILE MODAL */}
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
