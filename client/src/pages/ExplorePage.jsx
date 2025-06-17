// src/pages/ExplorePage.jsx

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

export default function ExplorePage() {
  const { user, authLoading } = useContext(AuthContext);
  const [posts, setPosts] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showScroll, setShowScroll] = useState(false);
  const sentinelRef = useRef();

  // ─── Scroll-to-top button visibility ───────────────────────
  useEffect(() => {
    const onScroll = () => setShowScroll(window.pageYOffset > 300);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const scrollToTop = () =>
    window.scrollTo({ top: 0, behavior: 'smooth' });

  // ─── Helper: shuffle array in-place (Fisher–Yates) ─────────
  const shuffleArray = arr => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // ─── Merge new batch, dedupe & shuffle ─────────────────────
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

  // ─── Load next page from global feed ────────────────────────
  const loadPage = async () => {
    if (!hasMore) return;
    setLoading(true);
    try {
      const pageSize = 100;
      if (authLoading || !user) return;
      const { data: newPosts } = await api.get('/posts', {
        params: { offset, limit: pageSize }
      });

      // build a set of originals the user has already shared
      const sharedSet = new Set(
        newPosts
          .filter(
            p =>
              p.type === 'share' &&
              ((p.sharer._id || p.sharer.id) === user.id)
          )
          .map(p => p.original._id)
      );

      // annotate each post with .shared
      const normalized = newPosts.map(p => {
        if (p.type === 'share') {
          return { ...p, shared: true };
        } else {
          return {
            ...p,
            shared: sharedSet.has(p._id),
          };
        }
      });

      if (normalized.length < pageSize) setHasMore(false);

      // merge + dedupe + shuffle
      mergePosts(normalized);

      setOffset(prev => prev + normalized.length);
    } catch (err) {
      console.error('Explore load error:', err);
      toast.error('Failed to load explore feed');
    } finally {
      setLoading(false);
    }
  };

  // ─── Initial / reset load ───────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    setPosts([]);
    setOffset(0);
    setHasMore(true);
    loadPage();
  }, [user, authLoading]);

  // ─── Infinite-scroll sentinel ───────────────────────────────
  useEffect(() => {
    if (!sentinelRef.current) return;
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
  }, [loading, hasMore, authLoading]);

  // ─── Persist saved state whenever posts change ──────────────
  useEffect(() => {
    let isMounted = true;
    if (authLoading || !user) return;
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
  }, [posts, user, authLoading]);

  // ─── Persist shared-flags ───────────────────────────────────
  useEffect(() => {
    setPosts(prev => {
      const sharedIds = new Set(
        prev
          .filter(p => p.type === 'share' && p.sharer._id === user.id)
          .map(s => s.original._id)
      );
      let changed = false;
      const updated = prev.map(p => {
        if (p.type === 'post') {
          const shouldBe = sharedIds.has(p._id);
          if (p.shared !== shouldBe) {
            changed = true;
            return { ...p, shared: shouldBe };
          }
        }
        return p;
      });
      return changed ? updated : prev;
    });
  }, [posts, user.id]);

  // ─── Handlers (identical to FeedPage) ───────────────────────
  const handleNewPost = newPost => {
    if (newPost?._id) {
      setPosts(prev => [newPost, ...prev]);
    }
  };
  const handleLike = (id, liked, cnt) =>
    setPosts(prev =>
      prev.map(p =>
        p._id === id ? { ...p, liked, likeCount: cnt } : p
      )
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
    setPosts(prev =>
      [
        stub,
        ...prev.map(p =>
          p._id === original._id
            ? {
              ...p,
              shared: true,
              shareCount: (p.shareCount || 0) + 1,
            }
            : p
        ),
      ]
    );
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
          Please log in to explore.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col lg:flex-row max-w-screen-xl mx-auto px-4 gap-6">
      <div className="hidden lg:block lg:w-2/12">
        <ProfileSidebar />
      </div>

      <div className="w-full lg:w-8/12 bg-base-100 dark:bg-base-200 p-4 rounded-lg space-y-6">
        <NewPostBox onNewPost={handleNewPost} />

        {posts.map(post => (
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
        ))}

        {loading &&
          [0, 1, 2].map(i => (
            <div
              key={`load-${i}`}
              className="h-48 bg-base-content/10 animate-pulse rounded-lg"
            />
          ))}

        <div ref={sentinelRef} />
      </div>

      <div className="hidden lg:block lg:w-2/12">
        <FriendsSidebar />
      </div>

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
