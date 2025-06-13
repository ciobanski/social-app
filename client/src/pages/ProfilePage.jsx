// src/pages/ProfilePage.jsx

import React, { useEffect, useState, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { toast } from 'react-toastify';
import { MdCake, MdPeople } from 'react-icons/md';
import { v4 as uuidv4 } from 'uuid';
import AuthContext from '../AuthContext';
import EditProfileModal from '../components/EditProfileModal';
import PostCard from '../components/PostCard';
import defaultAvatar from '../assets/default-avatar.png';

dayjs.extend(customParseFormat);

export default function ProfilePage() {
  const { id } = useParams();
  const { user: me, reload: reloadMe } = useContext(AuthContext);

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  // Track whether we've sent a friend request
  const [requestSent, setRequestSent] = useState(false);

  const isMe = me?.id === id;

  // ───── load user info ───────────────────────────────────────
  useEffect(() => {
    setLoadingProfile(true);
    api.get(`/users/${id}`)
      .then(res => setProfile(res.data))
      .catch(err => {
        console.error(err);
        toast.error(
          err.response?.status === 404
            ? 'User not found'
            : 'Could not load profile'
        );
      })
      .finally(() => setLoadingProfile(false));
  }, [id]);

  // ───── load raw posts + share-stubs ───────────────────────────
  useEffect(() => {
    async function loadPostsAndShares() {
      setLoadingPosts(true);
      try {
        const [myPostsRes, feedRes] = await Promise.all([
          api.get(`/users/${id}/posts`),
          api.get('/posts', { params: { limit: 1000 } })
        ]);

        // tag raw posts with type: 'post'
        const rawPosts = myPostsRes.data.map(p => ({
          ...p,
          type: 'post',
          saved: p.saved ?? false,
          shared: false,
        }));

        // pick out only the share-stubs this user made
        const shareStubs = feedRes.data
          .filter(item =>
            item.type === 'share' &&
            (item.sharer._id ?? item.sharer.id) === id
          )
          .map(s => ({
            ...s,
            saved: s.saved ?? false,
            shared: true,
          }));

        // merge & sort descending by createdAt
        const merged = [...shareStubs, ...rawPosts].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );

        setPosts(merged);
      } catch (err) {
        console.error(err);
        toast.error('Could not load posts');
      } finally {
        setLoadingPosts(false);
      }
    }
    loadPostsAndShares();
  }, [id]);

  // ───── Persist “saved” state on mount ────────────────────────
  useEffect(() => {
    let isMounted = true;
    api.get('/users/me/saves')
      .then(res => {
        if (!isMounted) return;
        const savedIds = new Set(
          res.data
            .filter(p => p && p._id)
            .map(p => p._id)
        );
        setPosts(prev => {
          let changed = false;
          const updated = prev.map(p => {
            const shouldBe = p.type === 'post' && savedIds.has(p._id);
            if (p.saved !== shouldBe) {
              changed = true;
              return { ...p, saved: shouldBe };
            }
            return p;
          });
          return changed ? updated : prev;
        });
      })
      .catch(console.error);
    return () => { isMounted = false; };
  }, []); // run once on mount

  // ───── Persist “shared” state on mount ───────────────────────
  useEffect(() => {
    let isMounted = true;
    api.get('/users/me/shares')
      .then(res => {
        if (!isMounted) return;
        const sharedIds = new Set(
          res.data
            .filter(s => s.original && s.original._id)
            .map(s => s.original._id)
        );
        setPosts(prev =>
          prev.map(p => ({
            ...p,
            shared: p.type === 'post'
              ? sharedIds.has(p._id)
              : p.shared
          }))
        );
      })
      .catch(console.error);
    return () => { isMounted = false; };
  }, []); // run once on mount

  // ───── send friend request ───────────────────────────────────
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

  // ───── action handlers (mirror FeedPage) ────────────────────
  const handleLike = (postId, liked, cnt) =>
    setPosts(ps =>
      ps.map(p =>
        p._id === postId ? { ...p, liked, likeCount: cnt } : p
      )
    );

  const handleSave = (postId, saved) =>
    setPosts(ps =>
      ps.map(p =>
        p._id === postId ? { ...p, saved } : p
      )
    );

  const handleShare = original => {
    const stubId = `stub-${uuidv4()}`;
    const stub = {
      _id: stubId,
      type: 'share',
      sharer: { ...me },
      original,
      saved: false,
      createdAt: new Date().toISOString(),
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
    setPosts(ps =>
      ps.map(p =>
        p._id === postId
          ? { ...p, commentCount: (p.commentCount || 0) + 1 }
          : p
      )
    );
  const handleDelete = async postId => {
    try {
      await api.delete(`/posts/${postId}`);
      setPosts(ps => ps.filter(p => p._id !== postId));
      toast.success('Post deleted');
    } catch {
      toast.error('Delete failed');
    }
  };

  // ───── loading / error states ────────────────────────────────
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

  // ───── formatters & fallbacks ───────────────────────────────
  const avatarSrc =
    typeof profile.avatarUrl === 'string' && profile.avatarUrl.trim()
      ? profile.avatarUrl
      : defaultAvatar;

  const fmtDate = raw => {
    let d = dayjs(raw, 'DD-MM-YYYY HH:mm:ss', true);
    if (!d.isValid()) d = dayjs(raw);
    return d.isValid() ? d.format('MMM D, YYYY') : '';
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* ───── HEADER ─────────────────────────────────────────── */}
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

        {/* Name, country, birthday, friends */}
        <div className="flex-1 text-center sm:text-left space-y-1">
          <h1 className="text-2xl font-semibold text-base-content">
            {profile.firstName} {profile.lastName}
          </h1>
          <p className="text-base-content/70">{profile.country || '—'}</p>
          {profile.birthday && (
            <p className="text-base-content/70 flex items-center justify-center sm:justify-start gap-1">
              <MdCake size={18} /> {fmtDate(profile.birthday)}
            </p>
          )}
          <p className="text-base-content/70 flex items-center justify-center sm:justify-start gap-1">
            <MdPeople size={18} /> Friends: {profile.friends?.length ?? 0}
          </p>
        </div>

        {/* Edit vs. Add Friend / Block */}
        <div className="flex flex-col space-y-2">
          {isMe ? (
            <button
              onClick={() => setEditOpen(true)}
              className="btn btn-primary btn-sm"
            >
              Edit Profile
            </button>
          ) : (
            <>
              <button
                onClick={handleAddFriend}
                disabled={requestSent}
                className={`btn btn-outline btn-sm ${requestSent ? 'opacity-50 cursor-default' : ''
                  }`}
              >
                {requestSent ? 'Requested' : 'Add Friend'}
              </button>
              <button className="btn btn-outline btn-sm">
                Block User
              </button>
            </>
          )}
        </div>
      </div>

      {/* ───── POSTS LIST ─────────────────────────────────────── */}
      <div className="space-y-6">
        {loadingPosts ? (
          [0, 1, 2].map(i => (
            <div
              key={i}
              className="h-48 bg-base-content/10 animate-pulse rounded-lg"
            />
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

      {/* ───── EDIT PROFILE MODAL ─────────────────────────────── */}
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
