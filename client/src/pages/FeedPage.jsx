// src/pages/FeedPage.jsx

import React, { useEffect, useState, useContext, useRef } from 'react';
import { toast } from 'react-toastify';
import { FiArrowUp } from 'react-icons/fi';
import { v4 as uuidv4 } from 'uuid';
import AuthContext from '../AuthContext';
import { api } from '../api';
import ProfileSidebar from '../components/ProfileSidebar';
import FriendsSidebar from '../components/FriendsSidebar';
import NewPostBox from '../components/NewPostBox';
import PostCard from '../components/PostCard';

export default function FeedPage() {
  const { user, authLoading } = useContext(AuthContext);
  const [friends, setFriends] = useState([]);
  const [posts, setPosts] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showScroll, setShowScroll] = useState(false);
  const sentinelRef = useRef();

  // ─── Scroll‐to‐top button visibility ────────────────────────
  useEffect(() => {
    const onScroll = () => setShowScroll(window.pageYOffset > 300);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const scrollToTop = () =>
    window.scrollTo({ top: 0, behavior: 'smooth' });

  // ─── 1) Load friend‐IDs once ────────────────────────────────
  useEffect(() => {
    if (authLoading || !user) return;
    api.get('/friends')
      .then(res => {
        setFriends(
          res.data.friends.map(f => f._id.toString())
        );
      })
      .catch(() => toast.error('Could not load friends list'));
  }, [user, authLoading]);

  // ─── Helper: shuffle an array in‐place (Fisher–Yates) ───────
  const shuffleArray = arr => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // ─── Helper: merge, dedupe, then shuffle ────────────────────
  const mergePosts = newBatch => {
    setPosts(prev => {
      const combined = [...prev, ...newBatch];
      const seen = new Set();
      const deduped = combined.filter(item => {
        if (seen.has(item._id)) return false;
        seen.add(item._id);
        return true;
      });
      return shuffleArray(deduped);
    });
  };

  // ─── 2) Fetch next page, annotate, filter by your friends, then merge ─────────
  const loadPage = async () => {
    if (loading || !hasMore || !user) return;
    setLoading(true);
    try {
      const pageSize = 25;
      if (authLoading || !user) return;
      const { data: batch } = await api.get('/posts', {
        params: { offset, limit: pageSize }
      });

      const meId = user.id;
      const allow = new Set([meId, ...friends]);

      // which originals you've shared?
      const sharedSet = new Set(
        batch
          .filter(item =>
            item.type === 'share' &&
            item.sharer._id.toString() === meId
          )
          .map(item => item.original._id)
      );

      // annotate .shared & filter by allow list
      const filtered = batch
        .map(item =>
          item.type === 'share'
            ? { ...item, shared: true }
            : { ...item, shared: sharedSet.has(item._id) }
        )
        .filter(item => {
          if (item.type === 'post') {
            return allow.has(item.author._id.toString());
          } else {
            return allow.has(item.sharer._id.toString());
          }
        });

      if (batch.length < pageSize) setHasMore(false);

      // merge + dedupe + shuffle
      mergePosts(filtered);

      // advance by however many came back
      setOffset(o => o + batch.length);
    } catch (err) {
      console.error('Feed load error:', err);
      toast.error('Failed to load feed');
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  // ─── 3) Reset & load on login or when friend‐IDs arrive ─────
  useEffect(() => {
    if (authLoading || !user || friends.length === 0) return;
    setPosts([]);
    setOffset(0);
    setHasMore(true);
    loadPage();
  }, [user, authLoading, friends.join(',')]);

  // ─── 4) Infinite‐scroll sentinel ───────────────────────────
  useEffect(() => {
    if (!sentinelRef.current || !user) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loading && hasMore) {
          loadPage();
        }
      },
      { rootMargin: '200px' }
    );
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [loading, hasMore, user]);

  // ─── 5) Refresh “saved” flags whenever posts change ─────────
  useEffect(() => {
    if (authLoading || !user) return;
    api.get('/users/me/saves')
      .then(res => {
        const savedIds = new Set(res.data.map(p => p._id));
        setPosts(prev =>
          prev.map(p =>
            p.type === 'post'
              ? { ...p, saved: savedIds.has(p._id) }
              : p
          )
        );
      })
      .catch(() => {
        /* silently ignore */
      });
  }, [posts, user, authLoading]);

  // ─── 6) Keep share‐flags in sync ───────────────────────────
  useEffect(() => {
    if (!user) return;
    const meId = user.id;
    setPosts(prev => {
      const sharedIds = new Set(
        prev
          .filter(p => p.type === 'share' && p.sharer._id.toString() === meId)
          .map(s => s.original._id)
      );
      let dirty = false;
      const updated = prev.map(p => {
        if (p.type === 'post') {
          const shouldBe = sharedIds.has(p._id);
          if (p.shared !== shouldBe) {
            dirty = true;
            return { ...p, shared: shouldBe };
          }
        }
        return p;
      });
      return dirty ? updated : prev;
    });
  }, [posts, user]);

  // ─── Handlers passed down to PostCard ──────────────────────
  const handleNewPost = newPost => {
    if (newPost?._id) setPosts(prev => [newPost, ...prev]);
  };
  const handleLike = (id, liked, cnt) =>
    setPosts(prev =>
      prev.map(p => (p._id === id ? { ...p, liked, likeCount: cnt } : p))
    );
  const handleSave = (id, saved) =>
    setPosts(prev =>
      prev.map(p => (p._id === id ? { ...p, saved } : p))
    );
  const handleShare = original => {
    if (!original?._id) return;
    const stubId = `stub-${uuidv4()}`;
    const stub = {
      _id: stubId,
      type: 'share',
      sharer: {
        _id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
      },
      original,
      saved: false,
      createdAt: new Date().toISOString(),
      shared: true,
    };
    setPosts(prev => [
      stub,
      ...prev.map(p =>
        p._id === original._id
          ? { ...p, shared: true, shareCount: (p.shareCount || 0) + 1 }
          : p
      ),
    ]);
    api
      .post(`/shares/${original._id}`)
      .then(() => toast.success('Post shared'))
      .catch(err => {
        if (err.response?.status === 409) toast.info('Already shared');
        else {
          console.error('Share error:', err);
          toast.error('Failed to share');
        }
        setPosts(prev => prev.filter(p => p._id !== stubId));
      });
  };
  const handleReport = () => toast.success('Reported');
  const handleCommentAdded = postId =>
    setPosts(prev =>
      prev.map(p =>
        p._id === postId
          ? { ...p, commentCount: (p.commentCount || 0) + 1 }
          : p
      )
    );
  const handleDelete = async id => {
    try {
      await api.delete(`/posts/${id}`);
      setPosts(prev => prev.filter(p => p._id !== id));
      toast.success('Post deleted');
    } catch {
      toast.error('Could not delete post');
    }
  };

  // ─── render ────────────────────────────────────────────────
  if (authLoading) return null;
  if (!user) {
    return (
      <div className="flex justify-center items-center h-full py-8">
        <p className="text-lg text-gray-400">
          Please log in to see the feed.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col lg:flex-row max-w-screen-xl mx-auto px-4 gap-6">
      {/* Left sidebar */}
      <div className="hidden lg:block lg:w-2/12">
        <ProfileSidebar />
      </div>

      {/* Main feed */}
      <div className="w-full lg:w-8/12 bg-base-100 dark:bg-base-200 p-4 rounded-lg space-y-6">
        <NewPostBox onNewPost={handleNewPost} />

        {posts.map(p => (
          <PostCard
            key={p._id}
            post={p}
            onLike={handleLike}
            onSave={handleSave}
            onShare={handleShare}
            onReport={handleReport}
            onCommentAdded={handleCommentAdded}
            onDelete={handleDelete}
            isSharedPreview={p.type === 'share'}
            sharer={p.sharer}
          />
        ))}

        {loading &&
          [0, 1, 2].map(i => (
            <div
              key={i}
              className="h-48 bg-base-content/10 animate-pulse rounded-lg"
            />
          ))}

        {/* infinite‐scroll sentinel */}
        <div ref={sentinelRef} />
      </div>

      {/* Right sidebar */}
      <div className="hidden lg:block lg:w-2/12">
        <FriendsSidebar />
      </div>

      {/* Scroll‐to‐top */}
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
    </div>
  );
}
